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
    title: '1 Point',
    description: 'Text/copy update or minor styling tweak in existing component.',
  },
  {
    points: 2,
    title: '2 Points',
    description: 'New field added to existing form with validation and DB column.',
  },
  {
    points: 3,
    title: '3 Points',
    description: 'Standard CRUD endpoint and simple list view with basic filtering.',
  },
  {
    points: 5,
    title: '5 Points',
    description: 'Webhook receiver with signature verification and retry queue.',
  },
  {
    points: 8,
    title: '8 Points',
    description: 'Multi-provider authentication flow with token refresh and error states.',
  },
  {
    points: 13,
    title: '13 Points',
    description: 'Live zero-downtime database schema migration across active tables.',
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
        points: 21,
        title: '21 Points',
        description: 'Large cross-system architectural overhaul or epic migration.',
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
    // Sort by points ascending
    const sorted = [...draftReferences].sort((a, b) => a.points - b.points);
    onUpdateReferences(sorted);
    setIsEditing(false);
  };

  return (
    <>
      <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/12 rounded-2xl p-4 shadow-[0_10px_30px_rgba(18,42,82,0.06)] flex flex-col gap-3 text-[#10233f]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-2 text-left hover:opacity-80 transition"
          >
            <span className="text-base">📚</span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#10233f] flex items-center gap-1.5">
                Point Reference Library
                <span className="text-[10px] font-normal text-[#5d6f88]">
                  ({activeRefs.length})
                </span>
              </h3>
            </div>
            <span className="text-xs text-[#5d6f88] ml-1">
              {isCollapsed ? '▼' : '▲'}
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            {isFacilitator && (
              <button
                onClick={handleOpenEdit}
                className="text-[11px] font-bold text-[#2047a8] hover:text-[#16347d] px-2 py-0.5 rounded-md hover:bg-[#edf3fb] transition"
                title="Edit Reference Benchmarks"
              >
                ✏️ Customize
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="flex flex-col gap-2 pt-1">
            <p className="text-[11px] text-[#5d6f88] leading-tight">
              Baseline benchmarks to anchor team mental models before voting:
            </p>

            <div className="space-y-1.5">
              {activeRefs.map((ref, idx) => (
                <div
                  key={`${ref.points}-${idx}`}
                  className="p-2 rounded-xl bg-[#f9fbff] hover:bg-[#edf3fb] border border-[#10233f]/10 transition flex items-start gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#2047a8] to-[#16347d] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
                    {ref.points}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#10233f] truncate">
                      {ref.title || `${ref.points} Points`}
                    </div>
                    <p className="text-[11px] text-[#5d6f88] leading-tight mt-0.5">
                      {ref.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Reference Cards Modal (Facilitator) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1220]/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-[#10233f]/15 rounded-3xl p-6 max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#10233f]/10 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📚</span>
                <div>
                  <h3 className="text-base font-bold text-[#10233f]">
                    Customize Point Reference Library
                  </h3>
                  <p className="text-xs text-[#5d6f88]">
                    Adjust baseline benchmark cards to match your team's tech stack and domain conventions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Card List Form */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {draftReferences.map((card, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#f9fbff] border border-[#10233f]/12 rounded-2xl flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-20">
                      <label className="text-[10px] font-bold text-[#5d6f88] uppercase block">
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
                        className="w-full px-2 py-1 bg-white border border-[#10233f]/15 rounded-lg text-xs font-bold text-[#10233f] focus:outline-none focus:ring-1 focus:ring-[#2047a8]"
                      />
                    </div>

                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-[#5d6f88] uppercase block">
                        Title / Benchmark Label
                      </label>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                        placeholder="e.g. 5 Points / Webhook Integration"
                        className="w-full px-2.5 py-1 bg-white border border-[#10233f]/15 rounded-lg text-xs font-bold text-[#10233f] focus:outline-none focus:ring-1 focus:ring-[#2047a8]"
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
                    <label className="text-[10px] font-bold text-[#5d6f88] uppercase block">
                      Description / Example
                    </label>
                    <textarea
                      rows={2}
                      value={card.description}
                      onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                      placeholder="Describe what a story of this size looks like for your team..."
                      className="w-full px-2.5 py-1.5 bg-white border border-[#10233f]/15 rounded-lg text-xs text-[#10233f] focus:outline-none focus:ring-1 focus:ring-[#2047a8] resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 mt-4 border-t border-[#10233f]/10 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCard}
                  className="px-3 py-1.5 text-xs font-bold bg-[#edf3fb] hover:bg-[#e2ebf7] text-[#2047a8] rounded-xl transition flex items-center gap-1"
                >
                  + Add Benchmark Card
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3 py-1.5 text-xs font-bold text-[#5d6f88] hover:text-[#10233f] rounded-xl hover:bg-slate-100 transition"
                >
                  Reset Defaults
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-[#5d6f88] hover:text-[#10233f] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#2047a8] to-[#16347d] hover:opacity-95 rounded-xl shadow-md transition"
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
