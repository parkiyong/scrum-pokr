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

  // Order participants so current user is index 0 (seated at the bottom)
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return 0;
  });

  const getSeatStyle = (index: number, total: number): React.CSSProperties => {
    if (total === 1) {
      return {
        position: 'absolute',
        left: '50%',
        top: '80%',
        transform: 'translate(-50%, -50%)',
      };
    }
    if (total === 2) {
      return {
        position: 'absolute',
        left: '50%',
        top: index === 0 ? '80%' : '20%',
        transform: 'translate(-50%, -50%)',
      };
    }
    if (total === 3) {
      const positions = [
        { left: '50%', top: '80%' }, // Bottom center (Self)
        { left: '80%', top: '30%' }, // Top Right
        { left: '20%', top: '30%' }, // Top Left
      ];
      return {
        position: 'absolute',
        left: positions[index]?.left || '50%',
        top: positions[index]?.top || '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    // For N >= 4: distribute around an ellipse
    // Start at bottom (angle = PI/2) for index 0
    const angle = (index / total) * 2 * Math.PI + Math.PI / 2;
    const left = 50 + 38 * Math.cos(angle);
    const top = 50 + 33 * Math.sin(angle);
    return {
      position: 'absolute',
      left: `${left}%`,
      top: `${top}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center py-4">
      {/* LIGHT FELT POKER TABLE */}
      <div className="relative w-full aspect-[16/10] max-h-[480px] min-h-[360px] rounded-[60px] sm:rounded-[100px] bg-gradient-to-b from-[#ffffff] via-[#edf3fb] to-[#e2ebf7] border-4 border-[#2047a8]/25 shadow-[0_24px_60px_rgba(18,42,82,0.12)] p-4">
        {/* Inner Table Felt Border & Glow */}
        <div className="absolute inset-3 sm:inset-5 rounded-[45px] sm:rounded-[80px] border border-[#2047a8]/15 pointer-events-none shadow-inner" />

        {/* Center Table Status & Results Hub (Positioned in Table Middle) */}
        <div className="absolute left-1/2 top-[42%] sm:top-[44%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center text-center max-w-[260px] sm:max-w-xs px-2 pointer-events-none">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#2047a8] mb-1.5 drop-shadow-sm">
            Round {roundNumber} • {phase}
          </span>

          {phase === 'Idle' && (
            <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/12 rounded-xl px-4 py-2.5 shadow-md">
              <p className="text-xs text-[#5d6f88] font-semibold">
                Waiting for Facilitator to start voting...
              </p>
            </div>
          )}

          {phase === 'Voting' && (
            <div className="bg-white/95 backdrop-blur-md border border-[#2047a8]/30 rounded-xl px-5 py-3 shadow-lg flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2047a8] animate-ping" />
                <span className="text-sm font-bold text-[#10233f]">
                  {votedCount} of {totalEstimators} Voted
                </span>
              </div>
              <p className="text-[10px] text-[#5d6f88] font-medium leading-tight">
                Votes masked by Reveal Gate until facilitator reveals.
              </p>
            </div>
          )}

          {isRevealed && consensus && (
            <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/15 rounded-2xl p-3.5 shadow-xl flex flex-col items-center gap-1.5 min-w-[180px]">
              <div className="flex items-center gap-2">
                {consensus.category === 'Consensus' ? (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 font-bold">
                    ✓ Consensus ({Math.round(consensus.consensus_pct)}%)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30 font-bold">
                    ⚡ {consensus.category} ({Math.round(consensus.consensus_pct)}%)
                  </span>
                )}
              </div>

              {consensus.suggested_points && (
                <div className="flex items-baseline gap-1.5 my-0.5">
                  <span className="text-3xl font-black text-[#10233f]">
                    {consensus.suggested_points}
                  </span>
                  <span className="text-xs font-bold text-[#5d6f88]">Story Points</span>
                </div>
              )}

              {consensus.min_vote && consensus.max_vote && consensus.min_vote !== consensus.max_vote && (
                <span className="text-[10px] font-mono font-semibold text-[#5d6f88]">
                  Spread: {consensus.min_vote} ↔ {consensus.max_vote} pts
                </span>
              )}
            </div>
          )}

          {isRevealed && !consensus && (
            <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/12 rounded-xl px-4 py-2.5 shadow-md">
              <p className="text-xs text-[#5d6f88] font-semibold">Cards revealed! No votes cast.</p>
            </div>
          )}
        </div>

        {/* Participant Seats around the Table Perimeter */}
        <div className="absolute inset-0 pointer-events-none">
          {sortedParticipants.map((p, index) => {
            const isSelf = p.id === currentUserId;
            const isFacilitator = p.id === facilitatorId;
            const isConsensus =
              isRevealed &&
              consensus?.suggested_points !== undefined &&
              String(p.vote) === String(consensus.suggested_points);
            const isOutlier =
              isRevealed &&
              consensus?.suggested_points !== undefined &&
              p.vote !== undefined &&
              p.vote !== null &&
              String(p.vote) !== String(consensus.suggested_points) &&
              p.vote !== '?';

            return (
              <div
                key={p.id}
                style={getSeatStyle(index, sortedParticipants.length)}
                className="pointer-events-auto transition-all duration-300"
              >
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
