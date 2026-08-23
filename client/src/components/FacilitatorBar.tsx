import React from 'react';
import { EstimationPhase, Story } from '../types/room';

interface FacilitatorBarProps {
  phase: EstimationPhase;
  activeStory?: Story | null;
  hasTracker?: boolean;
  onStartVoting: () => void;
  onRevealCards: () => void;
  onTriggerReVote: () => void;
  onFinalize: () => void;
  onSyncEstimate?: () => void;
  onDecomposeSlices?: () => void;
  isFacilitator: boolean;
  syncFeedback?: { success: boolean; message?: string } | null;
}

export const FacilitatorBar: React.FC<FacilitatorBarProps> = ({
  phase,
  activeStory,
  hasTracker = false,
  onStartVoting,
  onRevealCards,
  onTriggerReVote,
  onFinalize,
  onSyncEstimate,
  onDecomposeSlices,
  isFacilitator,
  syncFeedback,
}) => {
  if (!isFacilitator) {
    return null;
  }

  return (
    <div className="bg-white/95 backdrop-blur-md border border-[#2047a8]/20 rounded-2xl p-3 shadow-[0_14px_34px_rgba(18,42,82,0.1)] flex flex-wrap items-center justify-between gap-3 my-4">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#2047a8]">
          Facilitator Controls
        </span>

        {syncFeedback && (
          <span
            title={syncFeedback.message || (syncFeedback.success ? 'Successfully synced to tracker' : 'Sync failed')}
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
              syncFeedback.success
                ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-700 border border-rose-500/30'
            }`}
          >
            {syncFeedback.success
              ? '✓ Synced to Tracker'
              : syncFeedback.message
              ? `Sync failed: ${syncFeedback.message}`
              : 'Sync failed'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {phase === 'Idle' && (
          <button
            onClick={onStartVoting}
            className="px-4 py-2 text-xs font-bold rounded-full bg-[#2047a8] hover:bg-[#16347d] text-white shadow-md shadow-[#2047a8]/25 transition active:scale-95 flex items-center gap-1.5"
          >
            ▶ Start Voting
          </button>
        )}

        {phase === 'Voting' && (
          <button
            onClick={onRevealCards}
            className="px-4 py-2 text-xs font-bold rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/25 transition active:scale-95 flex items-center gap-1.5 animate-pulse"
          >
            👁 Reveal Cards
          </button>
        )}

        {(phase === 'Revealed' || phase === 'Discussing' || phase === 'Slicing') && (
          <>
            <button
              onClick={onTriggerReVote}
              className="px-3.5 py-2 text-xs font-bold rounded-full bg-[#edf3fb] hover:bg-[#e2ebf7] text-[#10233f] border border-[#10233f]/15 transition active:scale-95 flex items-center gap-1.5"
            >
              ↺ Re-Vote Round
            </button>
            {onDecomposeSlices && activeStory && (
              <button
                onClick={onDecomposeSlices}
                className="px-3.5 py-2 text-xs font-bold rounded-full bg-[#7f1d7a]/10 hover:bg-[#7f1d7a]/20 text-[#7f1d7a] border border-[#7f1d7a]/30 transition active:scale-95 flex items-center gap-1.5"
                title="Decompose story into vertical SPIDR slices"
              >
                ✂ SPIDR Slices
              </button>
            )}
            <button
              onClick={onFinalize}
              className="px-4 py-2 text-xs font-bold rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition active:scale-95 flex items-center gap-1.5"
            >
              ✓ Finalize Estimate
            </button>
          </>
        )}

        {phase === 'Finalized' && (
          <>
            {onSyncEstimate && activeStory && (
              <button
                onClick={onSyncEstimate}
                className="px-4 py-2 text-xs font-bold rounded-full bg-[#2047a8] hover:bg-[#16347d] text-white shadow-md shadow-[#2047a8]/25 transition active:scale-95 flex items-center gap-1.5 animate-pulse"
              >
                ⚡ Sync Estimate to {hasTracker ? 'Tracker' : 'Backlog'}
              </button>
            )}
            <button
              onClick={onStartVoting}
              className="px-3.5 py-2 text-xs font-bold rounded-full bg-[#edf3fb] hover:bg-[#e2ebf7] text-[#10233f] border border-[#10233f]/15 transition active:scale-95 flex items-center gap-1.5"
            >
              ▶ Next Story
            </button>
          </>
        )}
      </div>
    </div>
  );
};

