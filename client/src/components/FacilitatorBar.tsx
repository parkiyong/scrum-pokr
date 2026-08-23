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
    <div className="bg-slate-900/90 backdrop-blur border border-indigo-500/20 rounded-2xl p-3 shadow-xl flex flex-wrap items-center justify-between gap-3 my-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Facilitator Controls
        </span>

        {syncFeedback && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              syncFeedback.success
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {syncFeedback.success ? '✓ Synced to Tracker' : 'Sync failed'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {phase === 'Idle' && (
          <button
            onClick={onStartVoting}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center gap-1.5"
          >
            ▶ Start Voting
          </button>
        )}

        {phase === 'Voting' && (
          <button
            onClick={onRevealCards}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center gap-1.5 animate-pulse"
          >
            👁 Reveal Cards
          </button>
        )}

        {(phase === 'Revealed' || phase === 'Discussing' || phase === 'Slicing') && (
          <>
            <button
              onClick={onTriggerReVote}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 flex items-center gap-1.5"
            >
              ↺ Re-Vote Round
            </button>
            {onDecomposeSlices && activeStory && (
              <button
                onClick={onDecomposeSlices}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 transition active:scale-95 flex items-center gap-1.5"
                title="Decompose story into vertical SPIDR slices"
              >
                ✂ SPIDR Slices
              </button>
            )}
            <button
              onClick={onFinalize}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center gap-1.5"
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
                className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition active:scale-95 flex items-center gap-1.5 animate-pulse"
              >
                ⚡ Sync Estimate to {hasTracker ? 'Tracker' : 'Backlog'}
              </button>
            )}
            <button
              onClick={onStartVoting}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 flex items-center gap-1.5"
            >
              ▶ Next Story
            </button>
          </>
        )}
      </div>
    </div>
  );
};

