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
  onNextStory?: () => void;
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
  onNextStory,
  onSyncEstimate,
  onDecomposeSlices,
  isFacilitator,
  syncFeedback,
}) => {
  if (!isFacilitator) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-3 my-2.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
        FACILITATOR CONTROLS
      </span>

      {syncFeedback && (
        <span
          title={syncFeedback.message || (syncFeedback.success ? 'Successfully synced to tracker' : 'Sync failed')}
          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all ${
            syncFeedback.success
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-rose-100 text-rose-800 border border-rose-300'
          }`}
        >
          {syncFeedback.success
            ? '✓ Synced to Tracker'
            : syncFeedback.message
            ? `Sync failed: ${syncFeedback.message}`
            : 'Sync failed'}
        </span>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(phase === 'Idle' || phase === 'StoryDoctorReview') && (
          <button
            onClick={onStartVoting}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-xs transition active:scale-95 flex items-center gap-1.5"
          >
            Start Voting
          </button>
        )}

        {phase === 'Voting' && (
          <button
            onClick={onRevealCards}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-xs transition active:scale-95 flex items-center gap-1.5"
          >
            Reveal Cards
          </button>
        )}

        {(phase === 'Revealed' || phase === 'Discussing' || phase === 'Slicing') && (
          <>
            <button
              onClick={onTriggerReVote}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 transition active:scale-95 flex items-center gap-1.5 shadow-xs"
            >
              ↺ Re-Vote Round
            </button>
            {onDecomposeSlices && activeStory && (
              <button
                onClick={onDecomposeSlices}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition active:scale-95 flex items-center gap-1.5"
                title="Decompose story into vertical SPIDR slices"
              >
                ✂ SPIDR Slices
              </button>
            )}
            <button
              onClick={onFinalize}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 flex items-center gap-1.5"
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
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-xs transition active:scale-95 flex items-center gap-1.5"
              >
                Sync Estimate to {hasTracker ? 'Tracker' : 'Backlog'}
              </button>
            )}
            <button
              onClick={onNextStory || onStartVoting}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 transition active:scale-95 flex items-center gap-1.5 shadow-xs"
            >
              Next Story
            </button>
          </>
        )}
      </div>
    </div>
  );
};


