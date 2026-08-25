import React, { useState } from 'react';
import { Story } from '../types/room';

interface BacklogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  backlog: Story[];
  activeStoryId?: string;
  isFacilitator: boolean;
  onSelectStory: (storyId: string) => void;
  onAddStory?: (title: string, description: string) => Promise<void>;
  onReorder: (storyIds: string[]) => void;
  onRemove: (storyId: string) => void;
}

function sanitizeCsvCell(cell: string): string {
  if (!cell) return '';
  const trimmed = cell.trimStart();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${cell}`;
  }
  return cell;
}

export const BacklogDrawer: React.FC<BacklogDrawerProps> = ({
  isOpen,
  onClose,
  backlog,
  activeStoryId,
  isFacilitator,
  onSelectStory,
  onAddStory,
  onReorder,
  onRemove,
}) => {
  const [copied, setCopied] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const ids = backlog.map((s) => s.id);
    const temp = ids[index];
    ids[index] = ids[index - 1];
    ids[index - 1] = temp;
    onReorder(ids);
  };

  const handleMoveDown = (index: number) => {
    if (index >= backlog.length - 1) return;
    const ids = backlog.map((s) => s.id);
    const temp = ids[index];
    ids[index] = ids[index + 1];
    ids[index + 1] = temp;
    onReorder(ids);
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !onAddStory) return;
    setIsSubmitting(true);
    try {
      await onAddStory(newTitle.trim(), newDescription.trim());
      setNewTitle('');
      setNewDescription('');
      setShowAddForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyMarkdownSummary = () => {
    let md = '# Sprint Estimation Summary\n\n';
    md += '| Title | Description | Points |\n';
    md += '| --- | --- | --- |\n';

    for (const story of backlog) {
      const pts = story.points || '-';
      const title = story.title.replace(/\|/g, '\\|');
      const desc = (story.description || '-').replace(/\|/g, '\\|');
      md += `| ${title} | ${desc} | ${pts} |\n`;
    }

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadCsv = () => {
    let csv = 'Title,Description,Points\n';
    for (const story of backlog) {
      const pts = sanitizeCsvCell(story.points || '');
      const titleClean = sanitizeCsvCell(story.title);
      const titleEscaped = titleClean.replace(/"/g, '""');
      const descClean = sanitizeCsvCell(story.description || '');
      const descEscaped = descClean.replace(/"/g, '""');
      csv += `"${titleEscaped}","${descEscaped}",${pts}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'scrum-poker-backlog.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Backlog Queue ({backlog.length})
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {isFacilitator && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              {showAddForm ? '✕ Cancel' : '➕ Add Story'}
            </button>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={copyMarkdownSummary}
              disabled={backlog.length === 0}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1 disabled:opacity-40 shadow-xs"
              title="Copy formatted Markdown summary to clipboard"
            >
              {copied ? '✓ Copied!' : '📋 Copy MD'}
            </button>
            <button
              onClick={downloadCsv}
              disabled={backlog.length === 0}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition flex items-center gap-1 disabled:opacity-40 shadow-xs"
              title="Download Backlog CSV"
            >
              💾 CSV
            </button>
          </div>
        </div>

        {/* Add Story Inline Form */}
        {showAddForm && (
          <form onSubmit={handleCreateStory} className="p-3.5 bg-blue-50/50 border-b border-blue-100 space-y-2.5">
            <div className="text-xs font-bold text-slate-800">Add Story to Backlog</div>
            <input
              type="text"
              placeholder="Story Title (e.g. As a user, I want...)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none"
            />
            <textarea
              placeholder="Description & Acceptance Criteria (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-1.5 text-xs text-slate-900 outline-none resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
                className="px-3.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition"
              >
                {isSubmitting ? 'Adding...' : 'Save Story'}
              </button>
            </div>
          </form>
        )}

        {/* Backlog List */}
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
          {backlog.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-semibold text-slate-600">No stories in the backlog queue yet.</p>
              {isFacilitator && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition"
                >
                  Add a story to get started
                </button>
              )}
            </div>
          ) : (
            backlog.map((story, index) => {
              const isActive = story.id === activeStoryId;
              return (
                <div
                  key={story.id}
                  className={`p-3 rounded-xl border transition flex flex-col gap-2 ${
                    isActive
                      ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {story.points && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {story.points} pts
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2">
                        {story.title}
                      </h3>
                    </div>

                    {/* Active story indicator or Select button */}
                    <div className="flex items-center gap-1">
                      {isActive ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        isFacilitator && (
                          <button
                            onClick={() => onSelectStory(story.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                          >
                            Estimate
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {story.description && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 font-normal">
                      {story.description}
                    </p>
                  )}

                  {/* Facilitator Item Controls */}
                  {isFacilitator && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-900 rounded transition disabled:opacity-20 font-bold"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === backlog.length - 1}
                          className="px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-900 rounded transition disabled:opacity-20 font-bold"
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>

                      <button
                        onClick={() => onRemove(story.id)}
                        className="hover:text-rose-600 font-bold transition"
                        title="Remove from queue"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
