import React from 'react';
import { EstimationPhase, Story } from '../types/room';

interface FacilitatorBarProps {
  phase: EstimationPhase;
  activeStory?: Story | null;
  onStartVoting: () => void;
  onRevealCards: () => void;
  onTriggerReVote: () => void;
  onFinalize: () => void;
  onNextStory?: () => void;
  onOpenDeckConfig?: () => void;
  isFacilitator: boolean;
}

export const FacilitatorBar: React.FC<FacilitatorBarProps> = ({
  phase,
  onStartVoting,
  onRevealCards,
  onTriggerReVote,
  onFinalize,
  onNextStory,
  onOpenDeckConfig,
  isFacilitator,
}) => {
  if (!isFacilitator) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-3 my-2.5">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
        FACILITATOR CONTROLS
      </span>

      <div className="flex items-center gap-2 flex-wrap">
        {onOpenDeckConfig && (
          <button
            onClick={onOpenDeckConfig}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition active:scale-95 flex items-center gap-1 shadow-xs"
            title="Configure deck preset or custom scale"
          >
            ⚙️ Deck
          </button>
        )}

        {phase === 'Idle' && (
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

        {phase === 'Revealed' && (
          <>
            <button
              onClick={onTriggerReVote}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 transition active:scale-95 flex items-center gap-1.5 shadow-xs"
            >
              ↺ Re-Vote Round
            </button>
            <button
              onClick={onFinalize}
              className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              ✓ Finalize Estimate
            </button>
          </>
        )}

        {phase === 'Finalized' && (
          <button
            onClick={onNextStory || onStartVoting}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 transition active:scale-95 flex items-center gap-1.5 shadow-xs"
          >
            Next Story →
          </button>
        )}
      </div>
    </div>
  );
};
