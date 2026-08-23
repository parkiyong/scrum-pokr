import React from 'react';
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

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center py-6">
      {/* LIGHT FELT POKER TABLE */}
      <div className="relative w-full aspect-[16/9] max-h-[460px] min-h-[340px] rounded-[60px] sm:rounded-[100px] bg-gradient-to-b from-[#ffffff] via-[#edf3fb] to-[#e2ebf7] border-4 border-[#2047a8]/25 shadow-[0_24px_60px_rgba(18,42,82,0.12)] flex items-center justify-center p-6">
        {/* Inner Table Felt Border & Glow */}
        <div className="absolute inset-4 rounded-[45px] sm:rounded-[80px] border border-[#2047a8]/15 pointer-events-none shadow-inner" />

        {/* Center Table Status & Results Hub */}
        <div className="z-10 flex flex-col items-center text-center max-w-sm px-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2047a8] mb-1">
            Round {roundNumber} • {phase}
          </span>

          {phase === 'Idle' && (
            <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/12 rounded-xl px-5 py-3 shadow-md">
              <p className="text-xs text-[#5d6f88] font-semibold">
                Waiting for Facilitator to start voting...
              </p>
            </div>
          )}

          {phase === 'Voting' && (
            <div className="bg-white/95 backdrop-blur-md border border-[#2047a8]/30 rounded-xl px-6 py-3.5 shadow-lg flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2047a8] animate-ping" />
                <span className="text-sm font-bold text-[#10233f]">
                  {votedCount} of {totalEstimators} Voted
                </span>
              </div>
              <p className="text-[11px] text-[#5d6f88] font-medium">
                Votes masked by Reveal Gate until facilitator triggers Reveal.
              </p>
            </div>
          )}

          {isRevealed && consensus && (
            <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/15 rounded-2xl p-4 shadow-xl flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                {consensus.category === 'Consensus' ? (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 font-bold">
                    ✓ Consensus ({Math.round(consensus.consensus_pct)}%)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 font-bold">
                    ⚡ {consensus.category} ({Math.round(consensus.consensus_pct)}% agree)
                  </span>
                )}
              </div>

              {consensus.suggested_points && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-[#10233f]">
                    {consensus.suggested_points}
                  </span>
                  <span className="text-xs font-bold text-[#5d6f88]">Story Points</span>
                </div>
              )}

              {consensus.min_vote && consensus.max_vote && consensus.min_vote !== consensus.max_vote && (
                <span className="text-[11px] font-mono font-semibold text-[#5d6f88]">
                  Spread: {consensus.min_vote} ↔ {consensus.max_vote} pts
                </span>
              )}
            </div>
          )}

          {isRevealed && !consensus && (
            <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/12 rounded-xl px-5 py-3 shadow-md">
              <p className="text-xs text-[#5d6f88] font-semibold">Cards revealed! No votes cast.</p>
            </div>
          )}
        </div>

        {/* Participant Seats around the Table */}
        <div className="absolute inset-0 p-4 sm:p-6 flex flex-wrap items-center justify-around pointer-events-none">
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
              <div key={p.id} className="pointer-events-auto m-2">
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
