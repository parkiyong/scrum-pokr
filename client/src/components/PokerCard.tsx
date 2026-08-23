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
  const isRevealed = phase === 'Revealed' || phase === 'Finalized' || phase === 'Discussing' || phase === 'Slicing';
  const hasVote = participant.vote !== undefined && participant.vote !== null;
  const isFlipped = isRevealed && hasVote;

  const avatarColors: Record<string, string> = {
    indigo: 'from-[#2047a8] to-[#16347d] ring-[#2047a8]/50',
    emerald: 'from-emerald-600 to-emerald-700 ring-emerald-500/50',
    amber: 'from-amber-600 to-amber-700 ring-amber-500/50',
    rose: 'from-rose-600 to-rose-700 ring-rose-500/50',
    cyan: 'from-cyan-600 to-cyan-700 ring-cyan-500/50',
    violet: 'from-[#7f1d7a] to-[#9c2768] ring-[#7f1d7a]/50',
    slate: 'from-[#2f4565] to-[#10233f] ring-[#2f4565]/50',
  };

  const bgGrad = avatarColors[participant.avatar] || avatarColors.indigo;

  return (
    <div className="flex flex-col items-center gap-2 group transition-all duration-300">
      {/* 3D Flip Card Container */}
      <div className="w-16 h-24 sm:w-20 sm:h-28 perspective-1000">
        <div
          className={`relative w-full h-full transform-style-3d card-flip rounded-xl shadow-lg ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* CARD FRONT (Face-down / Hidden state) */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rounded-xl border flex flex-col items-center justify-center p-2 select-none transition-colors ${
              participant.voted
                ? 'bg-white border-[#2047a8] shadow-[#2047a8]/15 shadow-md ring-2 ring-[#2047a8]/20'
                : 'bg-[#f9fbff]/90 border-[#10233f]/15 text-[#5d6f88]'
            }`}
          >
            {participant.voted ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-[#2047a8]/10 border border-[#2047a8]/30 flex items-center justify-center text-[#2047a8] font-bold text-sm animate-pulse">
                  ✓
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#2047a8]">
                  {isSelf && participant.vote ? participant.vote : 'Voted'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-6 h-6 rounded-full border border-dashed border-[#10233f]/25 flex items-center justify-center text-xs text-[#5d6f88]">
                  ⋯
                </div>
                <span className="text-[9px] uppercase font-bold text-[#5d6f88]">
                  {participant.role === 'Observer' ? 'Observer' : 'Thinking'}
                </span>
              </div>
            )}
          </div>

          {/* CARD BACK (Revealed face-up state) */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border flex items-center justify-center p-2 select-none ${
              isConsensus
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400 ring-2 ring-emerald-400/40 shadow-emerald-500/30 shadow-lg text-white'
                : isOutlier
                ? 'bg-gradient-to-b from-rose-500 to-rose-700 border-rose-400 ring-2 ring-rose-400/40 shadow-rose-500/30 shadow-lg text-white'
                : 'bg-gradient-to-b from-[#2047a8] to-[#16347d] border-[#2047a8] text-white shadow-md'
            }`}
          >
            <span className="text-3xl sm:text-4xl font-black tracking-tight">
              {participant.vote}
            </span>
          </div>
        </div>
      </div>

      {/* Participant Avatar & Name Label */}
      <div className="flex items-center gap-1.5 bg-white/95 px-2.5 py-1 rounded-full border border-[#10233f]/12 max-w-[140px] shadow-sm">
        <div
          className={`w-4 h-4 rounded-full bg-gradient-to-tr ${bgGrad} ring-1 flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white uppercase`}
        >
          {participant.nickname.charAt(0)}
        </div>
        <span className="text-xs font-bold text-[#10233f] truncate">
          {participant.nickname} {isSelf && '(You)'}
        </span>
        {isFacilitator && (
          <span title="Facilitator" className="text-[10px] text-amber-500">
            👑
          </span>
        )}
      </div>
    </div>
  );
};
