import React, { useState } from 'react';
import { Story } from '../types/room';

interface BacklogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  backlog: Story[];
  activeStoryId?: string;
  isFacilitator: boolean;
  activeTrackerProvider?: string;
  onSelectStory: (storyId: string) => void;
  onReorder: (storyIds: string[]) => void;
  onRemove: (storyId: string) => void;
  onOpenConnectModal: () => void;
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
  activeTrackerProvider,
  onSelectStory,
  onReorder,
  onRemove,
  onOpenConnectModal,
}) => {
  const [copied, setCopied] = useState(false);

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

  const copyMarkdownSummary = () => {
    let md = '# Sprint Estimation Summary\n\n';
    md += '| Key | Title | Points | Status | Tracker |\n';
    md += '| --- | --- | --- | --- | --- |\n';

    for (const story of backlog) {
      const key = story.key || '-';
      const pts = story.points || '-';
      const status = story.status || 'Ready';
      const link = story.url ? `[Link](${story.url})` : '-';
      md += `| ${key} | ${story.title.replace(/\|/g, '\\|')} | ${pts} | ${status} | ${link} |\n`;
    }

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadCsv = () => {
    let csv = 'Key,Title,Points,Status,URL\n';
    for (const story of backlog) {
      const key = sanitizeCsvCell(story.key || '');
      const pts = sanitizeCsvCell(story.points || '');
      const status = sanitizeCsvCell(story.status || '');
      const url = sanitizeCsvCell(story.url || '');
      const titleClean = sanitizeCsvCell(story.title);
      const titleEscaped = titleClean.replace(/"/g, '""');
      csv += `${key},"${titleEscaped}",${pts},${status},${url}\n`;
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
              {activeTrackerProvider && (
                <span className="text-[10px] text-emerald-700 font-semibold">
                  Linked to {activeTrackerProvider}
                </span>
              )}
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
              onClick={onOpenConnectModal}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              ➕ Import Backlog
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

        {/* Backlog List */}
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
          {backlog.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-semibold text-slate-600">No stories in the backlog queue yet.</p>
              {isFacilitator && (
                <button
                  onClick={onOpenConnectModal}
                  className="mt-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition"
                >
                  Connect Tracker or Paste Markdown
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
                        {story.key && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                            {story.key}
                          </span>
                        )}
                        {story.points && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {story.points} pts
                          </span>
                        )}
                        {story.url && (
                          <a
                            href={story.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-600 hover:underline transition"
                            title="Open in external issue tracker"
                          >
                            ↗
                          </a>
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
