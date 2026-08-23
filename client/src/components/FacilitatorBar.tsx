import React from 'react';
import { Check, Crown, Eye, Play, RotateCcw, Scissors, Zap } from 'lucide-react';
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
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-3 shadow-soft flex flex-wrap items-center justify-between gap-3 my-3 transition-all">
      {/* Facilitator Status Label */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-xs">
          <Crown className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900 leading-none">
            Facilitator Controls
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Phase: {phase}</span>
        </div>

        {syncFeedback && (
          <span
            title={syncFeedback.message || (syncFeedback.success ? 'Successfully synced to tracker' : 'Sync failed')}
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all ml-2 flex items-center gap-1 ${
              syncFeedback.success
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {syncFeedback.success ? (
              <>
                <Check className="w-3 h-3" />
                <span>Synced to Tracker</span>
              </>
            ) : (
              <span>Sync failed: {syncFeedback.message || 'Error'}</span>
            )}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {(phase === 'Idle' || phase === 'StoryDoctorReview') && (
          <button
            onClick={onStartVoting}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all duration-150 active:scale-95 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Voting</span>
          </button>
        )}

        {phase === 'Voting' && (
          <button
            onClick={onRevealCards}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-600/25 transition-all duration-150 active:scale-95 flex items-center gap-1.5 ring-2 ring-emerald-500/20"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reveal Cards</span>
          </button>
        )}

        {(phase === 'Revealed' || phase === 'Discussing' || phase === 'Slicing') && (
          <>
            <button
              onClick={onTriggerReVote}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all duration-150 active:scale-95 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>Re-Vote Round</span>
            </button>
            {onDecomposeSlices && activeStory && (
              <button
                onClick={onDecomposeSlices}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition-all duration-150 active:scale-95 flex items-center gap-1.5"
                title="Decompose story into vertical SPIDR slices"
              >
                <Scissors className="w-3.5 h-3.5 text-violet-600" />
                <span>SPIDR Slices</span>
              </button>
            )}
            <button
              onClick={onFinalize}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all duration-150 active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Finalize Estimate</span>
            </button>
          </>
        )}

        {phase === 'Finalized' && (
          <>
            {onSyncEstimate && activeStory && (
              <button
                onClick={onSyncEstimate}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 transition-all duration-150 active:scale-95 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Sync Estimate to {hasTracker ? 'Tracker' : 'Backlog'}</span>
              </button>
            )}
            <button
              onClick={onStartVoting}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all duration-150 active:scale-95 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Next Story</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};


