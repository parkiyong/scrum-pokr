import React, { useState, useEffect } from 'react';
import { Story, StorySlice } from '../types/room';

interface SPIDRSliceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStory: Story | null;
  onPushSlices: (parentId: string, slices: StorySlice[]) => void;
}

export const SPIDRSliceModal: React.FC<SPIDRSliceModalProps> = ({
  isOpen,
  onClose,
  activeStory,
  onPushSlices,
}) => {
  const [slices, setSlices] = useState<StorySlice[]>([]);

  useEffect(() => {
    if (isOpen && activeStory) {
      setSlices([
        {
          title: `${activeStory.title} - Slice 1`,
          description: 'First vertical slice focusing on core happy path',
          acceptance_criteria: ['Core functionality works end-to-end'],
          estimated_points: 3,
        },
        {
          title: `${activeStory.title} - Slice 2`,
          description: 'Second vertical slice handling edge cases & error paths',
          acceptance_criteria: ['Error states handled gracefully'],
          estimated_points: 3,
        },
      ]);
    }
  }, [isOpen, activeStory?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !activeStory) return null;

  const handleUpdateSlice = (
    index: number,
    field: keyof StorySlice,
    value: string | number | string[] | undefined,
  ) => {
    const next = [...slices];
    next[index] = { ...next[index], [field]: value };
    setSlices(next);
  };

  const handleAddSlice = () => {
    if (slices.length >= 5) return;
    setSlices([
      ...slices,
      {
        title: `${activeStory.title} - Slice ${slices.length + 1}`,
        description: '',
        acceptance_criteria: [],
        estimated_points: 2,
      },
    ]);
  };

  const handleRemoveSlice = (index: number) => {
    if (slices.length <= 1) return;
    setSlices(slices.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const parentId = activeStory.external_id || activeStory.key || activeStory.id;
    onPushSlices(parentId, slices);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spidr-slice-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✂</span>
            <div>
              <h2 id="spidr-slice-modal-title" className="text-lg font-bold text-white">
                SPIDR Vertical Slicing
              </h2>
              <p className="text-xs text-slate-400">
                Decompose &ldquo;{activeStory.title}&rdquo; into independently deliverable slices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 text-indigo-300 text-xs">
            💡 <strong>SPIDR Method</strong>: Slice across <em>Spikes, Paths, Interfaces, Data, or Rules</em> to produce thin end-to-end vertical slices.
          </div>

          <div className="space-y-3">
            {slices.map((slice, index) => (
              <div
                key={index}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    Slice {index + 1}
                  </span>
                  {slices.length > 1 && (
                    <button
                      onClick={() => handleRemoveSlice(index)}
                      className="text-slate-500 hover:text-rose-400 text-xs transition"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      value={slice.title}
                      onChange={(e) => handleUpdateSlice(index, 'title', e.target.value)}
                      placeholder="Slice title..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      value={slice.estimated_points || ''}
                      onChange={(e) =>
                        handleUpdateSlice(
                          index,
                          'estimated_points',
                          parseInt(e.target.value, 10) || undefined
                        )
                      }
                      placeholder="Points"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={slice.description}
                    onChange={(e) => handleUpdateSlice(index, 'description', e.target.value)}
                    placeholder="Slice description / user flow..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {slices.length < 5 && (
            <button
              onClick={handleAddSlice}
              className="w-full py-2 bg-slate-950 border border-dashed border-slate-700 hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              + Add Another Slice
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
          >
            🚀 Push Slices to Tracker &amp; Queue
          </button>
        </div>
      </div>
    </div>
  );
};
