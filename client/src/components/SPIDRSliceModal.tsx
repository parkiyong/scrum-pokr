import React, { useState, useEffect } from 'react';
import { Plus, Scissors, Trash2, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spidr-slice-modal-title"
        className="bg-white border border-slate-200/90 rounded-3xl w-full max-w-2xl overflow-hidden shadow-modal flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 font-bold shadow-xs">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h2 id="spidr-slice-modal-title" className="text-base sm:text-lg font-bold font-display text-slate-900 leading-none">
                SPIDR Vertical Slicing
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Decompose &ldquo;{activeStory.title}&rdquo; into independently deliverable slices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          <div className="bg-violet-50/80 border border-violet-200 rounded-2xl p-3.5 text-violet-900 text-xs font-semibold leading-relaxed">
            💡 <strong>SPIDR Method</strong>: Slice across <em>Spikes, Paths, Interfaces, Data, or Rules</em> to produce thin end-to-end vertical slices.
          </div>

          <div className="space-y-3">
            {slices.map((slice, index) => (
              <div
                key={index}
                className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-violet-700 uppercase tracking-wider">
                    Slice {index + 1}
                  </span>
                  {slices.length > 1 && (
                    <button
                      onClick={() => handleRemoveSlice(index)}
                      className="text-slate-400 hover:text-rose-600 text-xs transition flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
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
                      className="w-full bg-white border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-3 py-2 text-slate-900 text-xs font-semibold outline-none transition"
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
                      className="w-full bg-white border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl px-3 py-2 text-slate-900 text-xs font-mono font-bold outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    value={slice.description}
                    onChange={(e) => handleUpdateSlice(index, 'description', e.target.value)}
                    placeholder="Slice description / user flow..."
                    className="w-full bg-white border border-slate-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 rounded-xl p-3 text-slate-900 text-xs font-medium resize-none outline-none leading-relaxed transition"
                  />
                </div>
              </div>
            ))}
          </div>

          {slices.length < 5 && (
            <button
              onClick={handleAddSlice}
              className="w-full py-2.5 bg-slate-50 border border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50/50 rounded-2xl text-xs font-bold text-slate-600 hover:text-violet-700 transition flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Another Slice</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center gap-1.5"
          >
            <span>🚀 Push Slices to Tracker &amp; Queue</span>
          </button>
        </div>
      </div>
    </div>
  );
};

