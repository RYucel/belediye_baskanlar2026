import React from 'react';
import { Mayor } from '../types';
import { Star, ChevronRight } from 'lucide-react';

interface MayorCardProps {
  key?: React.Key;
  mayor: Mayor;
  rank: number;
  onVoteClick: (mayor: Mayor) => void;
}

export function MayorCard({ mayor, rank, onVoteClick }: MayorCardProps) {
  
  const getPartyColor = (party: string) => {
    switch (party.toUpperCase()) {
      case 'CTP': return 'bg-emerald-600 text-white';
      case 'UBP': return 'bg-blue-600 text-white';
      case 'TDP': return 'bg-red-600 text-white';
      case 'DP': return 'bg-sky-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-4 lg:gap-6 py-6 lg:py-8 border-b border-gray-200 hover:bg-gray-50 transition-colors px-4 -mx-4 rounded-xl">
      
      {/* Rank */}
      <div className="col-span-1 lg:col-span-1 font-mono text-3xl lg:text-2xl font-bold opacity-60 text-center lg:text-left">
        {rank.toString().padStart(2, '0')}.
      </div>

      {/* Info */}
      <div className="col-span-1 lg:col-span-3 flex items-center justify-center lg:justify-start gap-4">
        <img 
          src={mayor.imageUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mayor.name)}&backgroundColor=1a1a1a&textColor=ffffff`} 
          alt={mayor.name} 
          className="w-16 h-16 lg:w-16 lg:h-16 rounded-full border-[3px] border-[#1a1a1a] object-cover shrink-0"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null; // Prevent infinite loop if fallback also fails
            e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mayor.name)}&backgroundColor=1a1a1a&textColor=ffffff`;
          }}
        />
        <div className="flex flex-col text-center lg:text-left">
          <div className="font-bold uppercase leading-none text-xl lg:text-lg tracking-tight">{mayor.city}</div>
          <div className="text-lg lg:text-base italic font-serif mt-1.5">{mayor.name}</div>
        </div>
      </div>
      
      {/* Party */}
      <div className="col-span-1 lg:col-span-1 flex justify-center lg:justify-start">
        <span className={`text-xs px-2 py-1 font-bold uppercase tracking-wider ${getPartyColor(mayor.party)}`}>
          {mayor.party}
        </span>
      </div>

      {/* Scores detailed */}
      <div className="col-span-1 lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs uppercase font-mono mt-4 lg:mt-0 mx-auto lg:mx-0 w-full max-w-lg">
        <div className="flex flex-col items-center lg:items-start bg-gray-100 p-2 rounded">
          <span className="text-[10px] opacity-60">ALTYAPI</span>
          <span className="font-bold text-sm">{mayor.score.infrastructure}</span>
        </div>
        <div className="flex flex-col items-center lg:items-start bg-gray-100 p-2 rounded">
          <span className="text-[10px] opacity-60">SOSYAL</span>
          <span className="font-bold text-sm">{mayor.score.social}</span>
        </div>
        <div className="flex flex-col items-center lg:items-start bg-gray-100 p-2 rounded">
          <span className="text-[10px] opacity-60">TRAFİK</span>
          <span className="font-bold text-sm">{mayor.score.traffic}</span>
        </div>
        <div className="flex flex-col items-center lg:items-start bg-gray-100 p-2 rounded">
          <span className="text-[10px] opacity-60">ŞEFFAF</span>
          <span className="font-bold text-sm">{mayor.score.transparency}</span>
        </div>
      </div>

      {/* Overall & Actions */}
      <div className="col-span-1 lg:col-span-3 flex flex-col lg:flex-row items-center justify-between lg:justify-end gap-4 mt-6 lg:mt-0">
        <div className="flex flex-col items-center lg:items-end lg:mr-2">
          <div className="font-mono font-black text-4xl lg:text-3xl leading-none tracking-tighter">
            {mayor.score.overall > 0 ? mayor.score.overall.toFixed(1) : '-'}
          </div>
          <div className="text-[10px] uppercase tracking-widest opacity-60 mt-1.5 font-bold">
            {mayor.totalVotes} OY
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onVoteClick(mayor)}
            className="text-xs font-bold uppercase tracking-widest bg-orange-500 text-[#1a1a1a] border-2 border-orange-500 px-3 py-2 hover:bg-[#1a1a1a] hover:text-orange-500 transition-colors"
          >
            OYLA
          </button>
        </div>
      </div>
    </div>
  );
}
