import React from 'react';
import { CheckCircle2, Users, Zap } from 'lucide-react';
import { ConsensusSummary, EstimationPhase, Participant } from '../types/room';
import { PokerCard } from './PokerCard';

interface PokerTableArenaProps {
  participants: Participant[];
  currentUserId: string;
  facilitatorId?: string;
  phase: EstimationPhase;
  roundNumber: number;
  consensus?: ConsensusSummary | null;
}

export const PokerTableArena: React.FC<PokerTableArenaProps> = ({
  participants,
  currentUserId,
  facilitatorId,
  phase,
  roundNumber,
  consensus,
}) => {
  const isRevealed = phase === 'Revealed' || phase === 'Finalized' || phase === 'Discussing' || phase === 'Slicing';
  const votedCount = participants.filter((p) => p.role === 'Estimator' && p.voted).length;
  const totalEstimators = participants.filter((p) => p.role === 'Estimator').length;
  const voteProgressPercent = totalEstimators > 0 ? (votedCount / totalEstimators) * 100 : 0;

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center py-4 sm:py-6">
      {/* POKER TABLE FELT ARENA */}
      <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[480px] min-h-[360px] rounded-[50px] sm:rounded-[90px] bg-gradient-to-b from-white via-slate-50 to-blue-50/20 border-4 sm:border-[6px] border-slate-200/90 shadow-card-lift flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Table Inner Stitched Ring Glow */}
        <div className="absolute inset-3 sm:inset-5 rounded-[40px] sm:rounded-[76px] border border-blue-500/10 pointer-events-none ring-1 ring-slate-900/[0.03] shadow-inner" />

        {/* Center Table Status & Results Hub */}
        <div className="z-10 flex flex-col items-center text-center max-w-sm px-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-700 mb-2 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>Round {roundNumber} • {phase}</span>
          </div>

          {phase === 'Idle' && (
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-6 py-4 shadow-soft">
              <p className="text-xs text-slate-600 font-semibold">
                Waiting for facilitator to start voting round...
              </p>
            </div>
          )}

          {phase === 'Voting' && (
            <div className="bg-white/95 backdrop-blur-xl border border-blue-200/80 rounded-2xl px-6 py-4 shadow-elevated flex flex-col items-center gap-2 max-w-xs">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Users className="w-4 h-4 text-blue-600" />
                <span>
                  {votedCount} of {totalEstimators} Voted
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${voteProgressPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-500 font-medium">
                Votes masked by Reveal Gate until facilitator reveals cards.
              </p>
            </div>
          )}

          {isRevealed && consensus && (
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-4 shadow-elevated flex flex-col items-center gap-2 min-w-[220px]">
              <div className="flex items-center gap-2">
                {consensus.category === 'Consensus' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Consensus ({Math.round(consensus.consensus_pct)}%)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{consensus.category} ({Math.round(consensus.consensus_pct)}% agree)</span>
                  </span>
                )}
              </div>

              {consensus.suggested_points && (
                <div className="flex items-baseline gap-2 my-0.5">
                  <span className="text-4xl sm:text-5xl font-black font-display tracking-tight text-slate-900 tabular-nums">
                    {consensus.suggested_points}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Points
                  </span>
                </div>
              )}

              {consensus.min_vote && consensus.max_vote && consensus.min_vote !== consensus.max_vote && (
                <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                  Spread: {consensus.min_vote} ↔ {consensus.max_vote} pts
                </span>
              )}
            </div>
          )}

          {isRevealed && !consensus && (
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl px-5 py-3.5 shadow-soft">
              <p className="text-xs text-slate-600 font-semibold">Cards revealed! No votes cast.</p>
            </div>
          )}
        </div>

        {/* Participant Seats around the Table */}
        <div className="absolute inset-0 p-3 sm:p-6 flex flex-wrap items-center justify-around pointer-events-none">
          {participants.map((p) => {
            const isSelf = p.id === currentUserId;
            const isFacilitator = p.id === facilitatorId;
            const isConsensus =
              isRevealed &&
              consensus?.suggested_points !== undefined &&
              p.vote === consensus.suggested_points;
            const isOutlier =
              isRevealed &&
              consensus?.suggested_points !== undefined &&
              p.vote !== undefined &&
              p.vote !== consensus.suggested_points &&
              p.vote !== '?';

            return (
              <div key={p.id} className="pointer-events-auto m-1.5 sm:m-2">
                <PokerCard
                  participant={p}
                  isSelf={isSelf}
                  isFacilitator={isFacilitator}
                  phase={phase}
                  isConsensus={isConsensus}
                  isOutlier={isOutlier}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

