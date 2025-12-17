import React, { useState } from 'react';
import { SocialMediaData } from '../types';
import { ExternalLink, Search, ChevronUp, ChevronDown } from 'lucide-react';

interface DataTableProps {
  data: SocialMediaData[];
}

type SortField = 'followers' | 'followerGrowth' | 'reach' | 'platform' | 'owner' | 'month';
type SortOrder = 'asc' | 'desc';

export const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('followers');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredData = data
    .filter(item => 
      item.pageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.month.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      // Handle Date Sort specifically via dateOrder if sorting by month
      if (sortField === 'month') {
         return sortOrder === 'asc' ? a.dateOrder - b.dateOrder : b.dateOrder - a.dateOrder;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      // Numbers
      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className="w-4 h-4 ml-1 opacity-20"><ChevronDown size={14} /></div>;
    return sortOrder === 'asc' ? <ChevronUp size={14} className="ml-1 text-blue-600" /> : <ChevronDown size={14} className="ml-1 text-blue-600" />;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="font-semibold text-slate-800">Detailed Report</h3>
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search pages, owners, or categories..."
            className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('month')}>
                <div className="flex items-center">Month <SortIcon field="month" /></div>
              </th>
              <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('platform')}>
                <div className="flex items-center">Platform <SortIcon field="platform" /></div>
              </th>
              <th className="px-6 py-3">Page Name</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('owner')}>
                <div className="flex items-center">Owner <SortIcon field="owner" /></div>
              </th>
              <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('followers')}>
                <div className="flex items-center justify-end">Followers <SortIcon field="followers" /></div>
              </th>
               <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('followerGrowth')}>
                <div className="flex items-center justify-end">Growth <SortIcon field="followerGrowth" /></div>
              </th>
              <th className="px-6 py-3 cursor-pointer hover:bg-slate-100 text-right" onClick={() => handleSort('reach')}>
                 <div className="flex items-center justify-end">Reach <SortIcon field="reach" /></div>
              </th>
              <th className="px-6 py-3 text-center">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((row, idx) => (
              <tr key={`${row.pageName}-${idx}`} className="hover:bg-slate-50 transition-colors">
                 <td className="px-6 py-3 text-slate-500 whitespace-nowrap">
                  {row.month}
                </td>
                <td className="px-6 py-3">
                   <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${row.platform === 'Facebook' ? 'bg-blue-100 text-blue-700' : 
                        row.platform === 'Instagram' ? 'bg-purple-100 text-purple-700' :
                        row.platform === 'TikTok' ? 'bg-slate-800 text-white' : 
                        row.platform === 'YouTube' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                      {row.platform}
                   </span>
                </td>
                <td className="px-6 py-3 font-medium text-slate-800">{row.pageName}</td>
                <td className="px-6 py-3 text-slate-500">{row.category}</td>
                <td className="px-6 py-3 text-slate-500">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.owner === 'Unknown' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                    {row.owner}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-mono">{row.followers.toLocaleString()}</td>
                <td className={`px-6 py-3 text-right font-mono ${row.followerGrowth > 0 ? 'text-emerald-600' : row.followerGrowth < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {row.followerGrowth > 0 ? '+' : ''}{row.followerGrowth.toLocaleString()}
                </td>
                <td className="px-6 py-3 text-right font-mono text-slate-600">{row.reach.toLocaleString()}</td>
                <td className="px-6 py-3 text-center">
                  <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 inline-flex">
                    <ExternalLink size={16} />
                  </a>
                </td>
              </tr>
            ))}
            {paginatedData.length === 0 && (
               <tr>
                 <td colSpan={9} className="text-center py-12 text-slate-400">
                   No data found matching your search.
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center">
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{((page - 1) * itemsPerPage) + 1}</span> to <span className="font-medium">{Math.min(page * itemsPerPage, filteredData.length)}</span> of <span className="font-medium">{filteredData.length}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};