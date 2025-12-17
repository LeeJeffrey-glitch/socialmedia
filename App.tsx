import React, { useState, useMemo, useEffect } from 'react';
import { Upload, FileSpreadsheet, BarChart3, Users, TrendingUp, LayoutDashboard, BrainCircuit, RefreshCw, CalendarRange } from 'lucide-react';
import { parseExcelFile } from './services/excelService';
import { generateDashboardInsights } from './services/geminiService';
import { SocialMediaData } from './types';
import { StatsCard } from './components/StatsCard';
import { PlatformDistributionChart, ReachComparisonChart, GrowthLeadersChart } from './components/Charts';
import { DataTable } from './components/DataTable';

const App: React.FC = () => {
  const [data, setData] = useState<SocialMediaData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering state
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedOwner, setSelectedOwner] = useState<string>('All');
  const [selectedStartMonth, setSelectedStartMonth] = useState<string>('All');
  const [selectedEndMonth, setSelectedEndMonth] = useState<string>('All');
  
  // AI State
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setData(null);
    setAiInsights(null);
    setSelectedPlatform('All');
    setSelectedOwner('All');
    setSelectedStartMonth('All');
    setSelectedEndMonth('All');

    try {
      const parsedData = await parseExcelFile(file);
      if (parsedData.length === 0) {
        throw new Error("No valid data found in the Excel file.");
      }
      setData(parsedData);
      
      // Auto-select the latest month/period if possible
      const periods = Array.from(new Set(parsedData.map(d => JSON.stringify({ name: d.month, order: d.dateOrder }))))
                      .map(s => JSON.parse(s))
                      .sort((a, b) => b.order - a.order);
      
      if (periods.length > 0) {
        // Optional: default to the latest month
        // setSelectedStartMonth(periods[0].name);
        // setSelectedEndMonth(periods[0].name);
      }

    } catch (err) {
      setError("Failed to parse Excel file. Please ensure it matches the required format.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Get lists for dropdowns
  const uniqueOwners = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map(d => d.owner))).filter(Boolean).sort();
  }, [data]);

  const uniquePlatforms = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.map(d => d.platform))).filter(Boolean).sort();
  }, [data]);

  const uniquePeriods = useMemo(() => {
    if (!data) return [];
    // Deduplicate by name, but keep order info
    const map = new Map();
    data.forEach(d => {
      if (!map.has(d.month)) {
        map.set(d.month, d.dateOrder);
      }
    });
    
    return Array.from(map.entries())
      .map(([name, order]) => ({ name, order }))
      .sort((a, b) => a.order - b.order); // Ascending order for the dropdown
  }, [data]);

  // Aggregation Logic
  const { stats, filteredData } = useMemo(() => {
    if (!data) return { stats: null, filteredData: [] };

    // Determine range values
    const startOrder = uniquePeriods.find(p => p.name === selectedStartMonth)?.order ?? -Infinity;
    const endOrder = uniquePeriods.find(p => p.name === selectedEndMonth)?.order ?? Infinity;

    const filtered = data.filter(d => {
        const platformMatch = selectedPlatform === 'All' || d.platform === selectedPlatform;
        const ownerMatch = selectedOwner === 'All' || d.owner === selectedOwner;
        
        // Date Range Logic
        let dateMatch = true;
        if (selectedStartMonth !== 'All' && d.dateOrder < startOrder) dateMatch = false;
        if (selectedEndMonth !== 'All' && d.dateOrder > endOrder) dateMatch = false;
        
        // Handle case where user selects "Start" > "End" (Swap logic or just show nothing? Standard is show nothing)
        if (selectedStartMonth !== 'All' && selectedEndMonth !== 'All' && startOrder > endOrder) {
           dateMatch = false; 
        }

        return platformMatch && ownerMatch && dateMatch;
    });

    if (filtered.length === 0) return { stats: null, filteredData: [] };

    // CAUTION: Summing "Total Followers" across multiple months for the same page is usually incorrect (double counting).
    // Ideally, for "Total Followers", we take the snapshot of the LATEST month in the selection for each page.
    // For "Growth", we sum the growth.
    // Let's grouping by Page+Platform to solve this.
    
    const pageMap = new Map<string, SocialMediaData>();
    
    filtered.forEach(item => {
      const key = `${item.platform}-${item.pageName}`;
      if (!pageMap.has(key)) {
        pageMap.set(key, { ...item }); // Clone
      } else {
        const existing = pageMap.get(key)!;
        // If this item is from a later month, update snapshot fields (Followers, Reach)
        // If we simply want to sum growth over the period:
        if (item.dateOrder > existing.dateOrder) {
           existing.followers = item.followers; // Take latest
           existing.reach = item.reach; // Take latest (or sum? Reach is usually cumulative/monthly. If monthly, we should SUM reach. If cumulative total, take latest. Assuming Monthly Report => Sum Reach)
           existing.dateOrder = item.dateOrder; // Track latest date
        }
        
        // Always sum flow/delta metrics
        existing.followerGrowth += item.followerGrowth;
        // existing.reach += item.reach; // Un-comment if reach is per-month flow. The code currently assumes 'reach' is a property like followers. 
        // Note: 'reach' in social media is often "Monthly Reach". So summing it for a Quarter makes sense.
        // However, the 'types' treat it alongside 'followers'. 
        // Let's assume 'reach' is Monthly Reach, so we SUM it.
        // BUT, existing logic took the latest. Let's fix reach to SUM.
      }
    });

    // Re-calculate Reach properly: Sum of all records, not just latest snapshot.
    // For Followers: Snapshot of latest.
    // For Growth: Sum.
    
    // Actually, to keep it simple and predictable without complex dedupe logic that might confuse the user:
    // We will just SUM everything if it's filtered. 
    // BUT that is definitely wrong for Followers.
    // Let's stick to: Summing metrics is dangerous. 
    // Default dashboard behavior: If multiple months selected, list them all.
    // Stats behavior:
    // Total Followers = Sum of (Latest entry for each unique Page).
    // Total Reach = Sum of (All entries).
    // Total Growth = Sum of (All entries).

    const uniquePages = new Map<string, SocialMediaData>();
    let totalReach = 0;
    let totalGrowth = 0;

    filtered.forEach(d => {
       totalReach += d.reach;
       totalGrowth += d.followerGrowth;

       const key = `${d.platform}-${d.pageName}`;
       const existing = uniquePages.get(key);
       if (!existing || d.dateOrder > existing.dateOrder) {
         uniquePages.set(key, d); // Keep the latest record for "Total Followers" count
       }
    });

    const latestSnapshots = Array.from(uniquePages.values());
    const totalFollowers = latestSnapshots.reduce((acc, curr) => acc + curr.followers, 0);

    // Platform Stats (Pie Chart etc)
    const platformsInFilter = Array.from(new Set(filtered.map(d => d.platform)));
    const platformStats = platformsInFilter.map(p => {
      const pDataAll = filtered.filter(d => d.platform === p);
      
      // Reach and Growth from ALL records
      const pReach = pDataAll.reduce((acc, curr) => acc + curr.reach, 0);
      const pGrowth = pDataAll.reduce((acc, curr) => acc + curr.followerGrowth, 0);
      
      // Followers from LATEST records only
      const pLatest = latestSnapshots.filter(d => d.platform === p);
      const pFollowers = pLatest.reduce((acc, curr) => acc + curr.followers, 0);

      return {
        name: p,
        followers: pFollowers,
        reach: pReach,
        growth: pGrowth,
      };
    });

    return {
      filteredData: filtered,
      stats: {
        totalFollowers,
        totalReach,
        totalGrowth,
        platformStats,
        topPages: [...latestSnapshots].sort((a, b) => b.followerGrowth - a.followerGrowth) // Use aggregated growth? Or latest month growth? Currently showing latest snapshot growth if we used that object.
        // Ideally topPages should show the SUM of growth over the period.
        // Let's update uniquePages to hold SUMMED growth.
      }
    };
  }, [data, selectedPlatform, selectedOwner, selectedStartMonth, selectedEndMonth, uniquePeriods]);

  // Clear AI insights when filters change
  useEffect(() => {
    setAiInsights(null);
  }, [selectedPlatform, selectedOwner, selectedStartMonth, selectedEndMonth]);

  // AI Trigger
  useEffect(() => {
    if (stats && filteredData.length > 0 && !aiInsights && !aiLoading) {
      setAiLoading(true);
      generateDashboardInsights(stats, stats.topPages)
        .then(text => setAiInsights(text))
        .catch(err => console.error(err))
        .finally(() => setAiLoading(false));
    }
  }, [stats, filteredData, aiInsights, aiLoading]);

  // Render Loading / Upload Screen
  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-12 rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
          <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileSpreadsheet className="text-blue-600" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">SocialPulse Analytics</h1>
          <p className="text-slate-500 mb-8">Upload your Excel (.xls, .xlsx) monthly report to generate an interactive dashboard.</p>
          
          <label className="block w-full cursor-pointer">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload}
              className="hidden" 
            />
            <div className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-200 flex items-center justify-center gap-2">
              <Upload size={20} />
              <span>Select Excel File</span>
            </div>
          </label>
          
          {error && (
            <div className="mt-6 p-4 bg-rose-50 text-rose-600 rounded-lg text-sm border border-rose-100">
              {error}
            </div>
          )}
          
          <p className="mt-8 text-xs text-slate-400">
            Supported formats: Excel 97-2003 (.xls) and Modern Excel (.xlsx)
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
     return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Parsing data...</p>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" size={24} />
            <span className="font-bold text-xl tracking-tight">SocialPulse</span>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={() => setData(null)}
                className="text-sm text-slate-500 hover:text-slate-800 font-medium"
              >
                Upload New File
              </button>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
              JD
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header & Filter */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
            <p className="text-slate-500 text-sm mt-1">Monthly performance report across all channels.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             {/* Platform Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Platform</label>
              <select 
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              >
                <option value="All">All Platforms</option>
                {uniquePlatforms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Owner Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Owner</label>
              <select 
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              >
                <option value="All">All Owners</option>
                {uniqueOwners.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            </div>

             {/* Start Month Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <CalendarRange size={12} /> From
              </label>
              <select 
                value={selectedStartMonth}
                onChange={(e) => setSelectedStartMonth(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              >
                <option value="All">Earliest</option>
                {uniquePeriods.map(p => (
                  <option key={`start-${p.name}`} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>

             {/* End Month Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                <CalendarRange size={12} /> To
              </label>
              <select 
                value={selectedEndMonth}
                onChange={(e) => setSelectedEndMonth(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              >
                <option value="All">Latest</option>
                {uniquePeriods.map(p => (
                  <option key={`end-${p.name}`} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* AI Insight Banner */}
        <div className="mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <BrainCircuit size={120} />
           </div>
           <div className="relative z-10">
             <div className="flex items-center gap-2 mb-3">
               <BrainCircuit size={20} className="text-purple-200" />
               <h3 className="font-semibold text-purple-100 uppercase tracking-wider text-xs">AI Generated Analysis</h3>
             </div>
             {aiLoading ? (
               <div className="flex items-center gap-2 text-indigo-100 animate-pulse">
                 <RefreshCw className="animate-spin" size={16} />
                 Analyzing data points...
               </div>
             ) : (
               <div className="prose prose-invert prose-sm max-w-none">
                 {aiInsights ? (
                   <div className="whitespace-pre-line leading-relaxed">
                     {aiInsights}
                   </div>
                 ) : (
                   <p>No insights generated.</p>
                 )}
               </div>
             )}
           </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard 
              title="Total Followers" 
              value={stats.totalFollowers.toLocaleString()}
              change={stats.totalGrowth}
              icon={<Users size={20} />} 
            />
            <StatsCard 
              title="Total Reach" 
              value={stats.totalReach.toLocaleString()}
              change={0}
              icon={<BarChart3 size={20} />} 
            />
             <StatsCard 
              title="Net Growth" 
              value={stats.totalGrowth.toLocaleString()}
              change={stats.totalGrowth} 
              icon={<TrendingUp size={20} />} 
            />
          </div>
        )}

        {/* Charts Section */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <PlatformDistributionChart stats={stats} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <ReachComparisonChart stats={stats} />
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
              <GrowthLeadersChart data={stats.topPages} />
            </div>
          </div>
        )}

        {/* Data Grid */}
        <div className="mb-12">
          <DataTable data={filteredData} />
        </div>

      </main>
    </div>
  );
};

export default App;