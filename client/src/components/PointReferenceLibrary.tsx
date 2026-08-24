import React, { useState } from 'react';
import { PointReference } from '../types/room';

interface PointReferenceLibraryProps {
  references: PointReference[];
  isFacilitator: boolean;
  onUpdateReferences: (references: PointReference[]) => void;
  defaultCollapsed?: boolean;
}

const DEFAULT_REFERENCES: PointReference[] = [
  {
    points: 1,
    title: 'T-Shirt S / Micro task',
    description: 'Minor copy tweak or small CSS update.',
  },
  {
    points: 3,
    title: 'Medium Story',
    description: 'Standard CRUD endpoint and table view.',
  },
  {
    points: 5,
    title: 'Large Story',
    description: 'Complex workflow, webhooks, or multi-step logic.',
  },
];

export const PointReferenceLibrary: React.FC<PointReferenceLibraryProps> = ({
  references = DEFAULT_REFERENCES,
  isFacilitator,
  onUpdateReferences,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isEditing, setIsEditing] = useState(false);
  const [draftReferences, setDraftReferences] = useState<PointReference[]>(references);

  const activeRefs = references.length > 0 ? references : DEFAULT_REFERENCES;

  const handleOpenEdit = () => {
    setDraftReferences(JSON.parse(JSON.stringify(activeRefs)));
    setIsEditing(true);
  };

  const handleFieldChange = (index: number, field: 'points' | 'title' | 'description', value: string | number) => {
    setDraftReferences((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddCard = () => {
    setDraftReferences((prev) => [
      ...prev,
      {
        points: 8,
        title: '8 Points / XL Story',
        description: 'Large cross-system architectural overhaul or migration.',
      },
    ]);
  };

  const handleRemoveCard = (index: number) => {
    setDraftReferences((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleResetDefaults = () => {
    setDraftReferences(JSON.parse(JSON.stringify(DEFAULT_REFERENCES)));
  };

  const handleSave = () => {
    const sorted = [...draftReferences].sort((a, b) => a.points - b.points);
    onUpdateReferences(sorted);
    setIsEditing(false);
  };

  // Helper to render icon for point sizes
  const renderPointIcon = (pts: number) => {
    if (pts <= 1) {
      // T-Shirt Icon
      return (
        <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
        </svg>
      );
    }
    // Document Lines Icon
    return (
      <svg className="w-5 h-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    );
  };

  return (
    <>
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col gap-3.5 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 text-left group"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              POINT REFERENCE LIBRARY
            </h3>
            <span className="text-xs text-slate-400 group-hover:text-slate-600">
              {isCollapsed ? '▼' : '▲'}
            </span>
          </button>
        </div>

        {/* Reference Items List */}
        {!isCollapsed && (
          <div className="flex flex-col gap-2.5">
            <div className="space-y-2">
              {activeRefs.map((ref, idx) => (
                <div
                  key={`${ref.points}-${idx}`}
                  className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 transition flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-100/90 border border-slate-200/80 flex items-center justify-center flex-shrink-0 relative">
                    {renderPointIcon(ref.points)}
                    <span className="absolute -bottom-1 -right-1 bg-white border border-slate-200 text-[10px] font-bold text-slate-700 px-1 rounded-md shadow-xs">
                      {ref.points}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {ref.title || `${ref.points} Points`}
                    </div>
                    {ref.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {ref.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Customize Button */}
            {isFacilitator && (
              <div className="pt-2">
                <button
                  onClick={handleOpenEdit}
                  className="w-full py-2 px-3 text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 rounded-xl border border-slate-200 transition shadow-xs flex items-center justify-center"
                >
                  Customize
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Reference Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Customize Point Reference Library
                </h3>
                <p className="text-xs text-slate-500">
                  Adjust baseline story points to match your team conventions.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-700 text-base p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {draftReferences.map((card, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-18">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">
                        Points
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={card.points}
                        onChange={(e) =>
                          handleFieldChange(idx, 'points', parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">
                        Title / Label
                      </label>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                        placeholder="e.g. Medium Story"
                        className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <button
                      onClick={() => handleRemoveCard(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 self-end text-xs font-bold"
                      title="Remove card"
                    >
                      🗑️
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={card.description}
                      onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                      placeholder="Describe what a story of this size looks like..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCard}
                  className="px-2.5 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                >
                  + Add Card
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Save Reference Library
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

