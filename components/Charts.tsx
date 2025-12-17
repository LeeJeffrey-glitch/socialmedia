import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip
} from 'recharts';
import { AggregatedStats, SocialMediaData } from '../types';

interface ChartsProps {
  stats: AggregatedStats;
  data: SocialMediaData[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'];

export const PlatformDistributionChart: React.FC<{ stats: AggregatedStats }> = ({ stats }) => {
  return (
    <div className="h-80 w-full">
      <h4 className="text-sm font-semibold text-slate-500 mb-4 text-center">Followers by Platform</h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={stats.platformStats}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="followers"
          >
            {stats.platformStats.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip formatter={(value: number) => value.toLocaleString()} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ReachComparisonChart: React.FC<{ stats: AggregatedStats }> = ({ stats }) => {
  return (
    <div className="h-80 w-full">
       <h4 className="text-sm font-semibold text-slate-500 mb-4 text-center">Total Reach by Platform</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={stats.platformStats}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickFormatter={(val) => `${(val / 1000000).toFixed(1)}M`} />
          <YAxis dataKey="name" type="category" width={80} />
          <Tooltip 
            formatter={(value: number) => value.toLocaleString()} 
            cursor={{fill: '#f1f5f9'}}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="reach" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const GrowthLeadersChart: React.FC<{ data: SocialMediaData[] }> = ({ data }) => {
  // Get top 5 growers by absolute number
  const topGrowers = [...data].sort((a, b) => b.followerGrowth - a.followerGrowth).slice(0, 5);

  return (
    <div className="h-80 w-full">
      <h4 className="text-sm font-semibold text-slate-500 mb-4 text-center">Top 5 Growing Pages (Absolute)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={topGrowers}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="pageName" tick={{fontSize: 10}} interval={0} />
          <YAxis tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
          <Tooltip 
            formatter={(value: number) => value.toLocaleString()}
            cursor={{fill: '#f1f5f9'}}
             contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="followerGrowth" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
