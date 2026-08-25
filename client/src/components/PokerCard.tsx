import React from 'react';
import { Participant } from '../types/room';

interface PokerCardProps {
  participant: Participant;
  isSelf: boolean;
  isFacilitator: boolean;
  phase: string;
  isConsensus?: boolean;
  isOutlier?: boolean;
}

export const PokerCard: React.FC<PokerCardProps> = ({
  participant,
  isSelf,
  isFacilitator,
  phase,
  isConsensus,
  isOutlier,
}) => {
  const isRevealed = phase === 'Revealed' || phase === 'Finalized';
  const hasVote = participant.vote !== undefined && participant.vote !== null;
  const isVoted = participant.has_voted || hasVote;
  const displayName = participant.name || (participant as any).nickname || 'Estimator';

  const avatarColors: Record<string, { from: string; to: string; bg: string; text: string }> = {
    indigo: { from: '#3b82f6', to: '#1d4ed8', bg: 'bg-blue-100', text: 'text-blue-700' },
    emerald: { from: '#10b981', to: '#047857', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    amber: { from: '#f59e0b', to: '#b45309', bg: 'bg-amber-100', text: 'text-amber-700' },
    rose: { from: '#f43f5e', to: '#be123c', bg: 'bg-rose-100', text: 'text-rose-700' },
    cyan: { from: '#06b6d4', to: '#0e7490', bg: 'bg-cyan-100', text: 'text-cyan-700' },
    violet: { from: '#8b5cf6', to: '#6d28d9', bg: 'bg-purple-100', text: 'text-purple-700' },
    slate: { from: '#64748b', to: '#334155', bg: 'bg-slate-100', text: 'text-slate-700' },
  };

  const col = avatarColors[participant.avatar] || avatarColors.indigo;

  return (
    <div className="flex flex-col items-center gap-1 group select-none">
      {/* If Revealed with a vote, show the upright, legible card above avatar */}
      {isRevealed && hasVote ? (
        <div className="w-12 h-17 sm:w-14 sm:h-20 mb-0.5 animate-in zoom-in-90 duration-200">
          <div
            className={`relative w-full h-full rounded-xl shadow-md flex items-center justify-center p-1.5 border transition-all ${
              isConsensus
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400 text-white shadow-emerald-500/25 ring-2 ring-emerald-300/50'
                : isOutlier
                ? 'bg-gradient-to-b from-rose-500 to-rose-700 border-rose-400 text-white shadow-rose-500/25'
                : 'bg-gradient-to-b from-blue-600 to-blue-800 border-blue-500 text-white shadow-blue-500/25'
            }`}
          >
            <span className="text-xl sm:text-2xl font-black tracking-tight select-none">
              {participant.vote}
            </span>
          </div>
        </div>
      ) : null}

      {/* Avatar Container with Facilitator Crown */}
      <div className="relative flex flex-col items-center">
        {isFacilitator && (
          <div
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs sm:text-sm drop-shadow-xs pointer-events-none z-10"
            title="Facilitator"
          >
            👑
          </div>
        )}

        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white p-0.5 shadow-sm border-2 border-blue-200 flex items-center justify-center">
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-inner"
            style={{ background: `linear-gradient(135deg, ${col.from}, ${col.to})` }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Name */}
      <div className="text-[11px] sm:text-xs font-bold text-slate-800 flex items-center gap-1 drop-shadow-2xs text-center max-w-[100px] truncate">
        <span className="truncate">{displayName}</span>
        {isSelf && <span className="font-semibold text-slate-500 text-[10px]">(You)</span>}
      </div>

      {/* Status Badge below name */}
      <div>
        {isVoted ? (
          <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] shadow-2xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a]" />
            <span>Voted</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-[#fef3c7] text-[#b45309] border border-[#fde68a] shadow-2xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
            <span>{participant.role === 'Observer' ? 'Observer' : 'Thinking'}</span>
          </span>
        )}
      </div>
    </div>
  );
};
