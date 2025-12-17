import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number; // Absolute change
  changePct?: number; // Percent change (0-1 scale)
  icon: React.ReactNode;
  colorClass?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  title, 
  value, 
  change, 
  changePct,
  icon,
  colorClass = "bg-white"
}) => {
  const isPositive = (change || 0) > 0;
  const isNeutral = (change || 0) === 0;

  return (
    <div className={`p-6 rounded-xl shadow-sm border border-slate-100 ${colorClass}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
          {icon}
        </div>
      </div>
      
      {(change !== undefined) && (
        <div className="mt-4 flex items-center text-sm">
          {isNeutral ? (
            <span className="flex items-center text-slate-400 font-medium">
              <Minus size={16} className="mr-1" /> No Change
            </span>
          ) : isPositive ? (
            <span className="flex items-center text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={16} className="mr-1" />
              {changePct ? `${(changePct * 100).toFixed(1)}%` : `+${change?.toLocaleString()}`}
            </span>
          ) : (
            <span className="flex items-center text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded-full">
              <ArrowDownRight size={16} className="mr-1" />
              {changePct ? `${(changePct * 100).toFixed(1)}%` : change?.toLocaleString()}
            </span>
          )}
          <span className="text-slate-400 ml-2">vs last month</span>
        </div>
      )}
    </div>
  );
};
