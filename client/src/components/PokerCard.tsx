import React from 'react';
import { Check, Crown, Eye } from 'lucide-react';
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

  const avatarColors: Record<string, { bg: string; border: string }> = {
    indigo: { bg: 'from-blue-600 to-indigo-700', border: 'border-blue-500/30' },
    emerald: { bg: 'from-emerald-600 to-teal-700', border: 'border-emerald-500/30' },
    amber: { bg: 'from-amber-500 to-amber-700', border: 'border-amber-500/30' },
    rose: { bg: 'from-rose-500 to-rose-700', border: 'border-rose-500/30' },
    cyan: { bg: 'from-cyan-500 to-blue-600', border: 'border-cyan-500/30' },
    violet: { bg: 'from-violet-600 to-purple-800', border: 'border-violet-500/30' },
    slate: { bg: 'from-slate-600 to-slate-800', border: 'border-slate-500/30' },
  };

  const avatarStyle = avatarColors[participant.avatar] || avatarColors.indigo;

  return (
    <div className="flex flex-col items-center gap-2 group transition-all duration-300">
      {/* 3D Flip Card Container */}
      <div className="w-16 h-24 sm:w-20 sm:h-28 perspective-1000">
        <div
          className={`relative w-full h-full transform-style-3d card-flip rounded-2xl shadow-elevated transition-transform duration-500 ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* CARD FRONT (Face-down / Hidden state) */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rounded-2xl border flex flex-col items-center justify-center p-2 select-none transition-all duration-200 ${
              participant.voted
                ? 'bg-white border-blue-500/40 shadow-glow ring-2 ring-blue-500/20'
                : 'bg-slate-50/90 border-slate-200/90 text-slate-400'
            }`}
          >
            {participant.voted ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold shadow-xs">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-mono font-bold tracking-wider text-blue-700 uppercase">
                  {isSelf && participant.vote ? participant.vote : 'Voted'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                {participant.role === 'Observer' ? (
                  <>
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Observer
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400 animate-pulse">
                      ⋯
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Thinking
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* CARD BACK (Revealed face-up state) */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border flex items-center justify-center p-2 select-none shadow-md ${
              isConsensus
                ? 'bg-gradient-to-b from-emerald-500 to-emerald-700 border-emerald-400 text-white shadow-glow-emerald ring-2 ring-emerald-400/30'
                : isOutlier
                ? 'bg-gradient-to-b from-rose-500 to-rose-700 border-rose-400 text-white shadow-glow-rose ring-2 ring-rose-400/30'
                : 'bg-gradient-to-b from-blue-600 to-indigo-800 border-blue-500 text-white shadow-glow'
            }`}
          >
            <span className="font-display font-black text-3xl sm:text-4xl tabular-nums tracking-tight drop-shadow-sm">
              {participant.vote}
            </span>
          </div>
        </div>
      </div>

      {/* Participant Avatar & Name Label */}
      <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-200/90 max-w-[140px] shadow-soft">
        <div
          className={`w-4 h-4 rounded-full bg-gradient-to-tr ${avatarStyle.bg} ring-1 ring-white flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white uppercase shadow-xs`}
        >
          {participant.nickname.charAt(0)}
        </div>
        <span className="text-xs font-semibold text-slate-900 truncate">
          {participant.nickname} {isSelf && '(You)'}
        </span>
        {isFacilitator && (
          <Crown className="w-3 h-3 text-amber-500 flex-shrink-0" />
        )}
      </div>
    </div>
  );
};

