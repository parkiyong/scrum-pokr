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

  // Order participants so current user is index 0 (seated at the bottom center)
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
        top: index === 0 ? '80%' : '18%',
        transform: 'translate(-50%, -50%)',
      };
    }
    if (total === 3) {
      const positions = [
        { left: '50%', top: '80%' }, // Bottom center (Self)
        { left: '78%', top: '24%' }, // Top Right
        { left: '22%', top: '24%' }, // Top Left
      ];
      return {
        position: 'absolute',
        left: positions[index]?.left || '50%',
        top: positions[index]?.top || '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    // For N >= 4: distribute around the oval perimeter
    // Start at bottom (angle = PI/2) for index 0 (Self)
    const angle = (index / total) * 2 * Math.PI + Math.PI / 2;
    const left = 50 + 38 * Math.cos(angle);
    const top = 50 + 30 * Math.sin(angle);
    return {
      position: 'absolute',
      left: `${left}%`,
      top: `${top}%`,
      transform: 'translate(-50%, -50%)',
    };
  };

  return (
    <div className="relative w-full flex flex-col items-center justify-center py-2">
      {/* SKY BLUE OVAL / STADIUM POKER TABLE */}
      <div className="relative w-full aspect-[16/10] max-h-[460px] min-h-[320px] rounded-[110px] sm:rounded-[150px] bg-gradient-to-b from-[#e3f0fc] via-[#d6e8fa] to-[#c7e0f8] border-[10px] sm:border-[14px] border-[#c0dbf7] shadow-[0_12px_36px_rgba(37,99,235,0.08)] flex items-center justify-center p-4">
        {/* Inner Table Felt Border & Glow */}
        <div className="absolute inset-2 sm:inset-3 rounded-[95px] sm:rounded-[135px] border border-[#a3c9f3]/70 pointer-events-none shadow-inner" />

        {/* Center Table Status Hub */}
        <div className="z-10 flex flex-col items-center text-center max-w-[280px] sm:max-w-xs px-2 pointer-events-none">
          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-800 mb-1">
            ROUND {roundNumber} • {phase.toUpperCase()}
          </span>

          {phase === 'Idle' && (
            <p className="text-xs text-slate-600 font-medium">
              Waiting for Facilitator to start voting...
            </p>
          )}

          {phase === 'StoryDoctorReview' && (
            <p className="text-xs text-slate-600 font-medium">
              Reviewing INVEST criteria &amp; edge cases...
            </p>
          )}

          {phase === 'Voting' && (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {votedCount} of {totalEstimators} Voted
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal leading-tight">
                Private voting in progress
              </p>
            </div>
          )}

          {isRevealed && consensus && (
            <div className="bg-white/95 backdrop-blur-md border border-blue-200/80 rounded-2xl p-3 shadow-lg flex flex-col items-center gap-1 min-w-[170px]">
              <div className="flex items-center gap-1.5">
                {consensus.category === 'Consensus' ? (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                    ✓ Consensus ({Math.round(consensus.consensus_pct)}%)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                    ⚡ {consensus.category} ({Math.round(consensus.consensus_pct)}%)
                  </span>
                )}
              </div>

              {consensus.suggested_points && (
                <div className="flex items-baseline gap-1 my-0.5">
                  <span className="text-3xl font-black text-slate-900">
                    {consensus.suggested_points}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Story Points</span>
                </div>
              )}

              {consensus.min_vote && consensus.max_vote && consensus.min_vote !== consensus.max_vote && (
                <span className="text-[10px] font-mono font-semibold text-slate-500">
                  Spread: {consensus.min_vote} ↔ {consensus.max_vote} pts
                </span>
              )}
            </div>
          )}

          {isRevealed && !consensus && (
            <p className="text-xs text-slate-600 font-medium">Cards revealed!</p>
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

