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
    <div className="fixed inset-0 z-40 flex justify-end bg-[#10233f]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white border-l border-[#10233f]/12 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#10233f]/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <div>
              <h2 className="text-base font-bold text-[#10233f]">
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
            className="text-[#5d6f88] hover:text-[#10233f] p-1 rounded-lg hover:bg-[#edf3fb] transition"
          >
            ✕
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="p-3 bg-[#f9fbff] border-b border-[#10233f]/10 flex flex-wrap items-center justify-between gap-2">
          {isFacilitator && (
            <button
              onClick={onOpenConnectModal}
              className="px-3 py-1.5 bg-[#2047a8] hover:bg-[#16347d] text-white rounded-full text-xs font-bold shadow transition flex items-center gap-1.5"
            >
              ➕ Import Backlog
            </button>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={copyMarkdownSummary}
              disabled={backlog.length === 0}
              className="px-2.5 py-1.5 bg-[#edf3fb] hover:bg-[#e2ebf7] text-[#10233f] rounded-full text-xs font-semibold border border-[#10233f]/12 transition flex items-center gap-1 disabled:opacity-40"
              title="Copy formatted Markdown summary to clipboard"
            >
              {copied ? '✓ Copied!' : '📋 Copy MD'}
            </button>
            <button
              onClick={downloadCsv}
              disabled={backlog.length === 0}
              className="px-2.5 py-1.5 bg-[#edf3fb] hover:bg-[#e2ebf7] text-[#10233f] rounded-full text-xs font-semibold border border-[#10233f]/12 transition flex items-center gap-1 disabled:opacity-40"
              title="Download Backlog CSV"
            >
              💾 CSV
            </button>
          </div>
        </div>

        {/* Backlog List */}
        <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
          {backlog.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-[#5d6f88] space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-semibold">No stories in the backlog queue yet.</p>
              {isFacilitator && (
                <button
                  onClick={onOpenConnectModal}
                  className="mt-2 px-3 py-1.5 bg-[#edf3fb] hover:bg-[#e2ebf7] text-[#2047a8] rounded-full text-xs font-bold border border-[#2047a8]/20 transition"
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
                      ? 'bg-[#2047a8]/10 border-[#2047a8]/40 shadow-sm'
                      : 'bg-[#f9fbff] border-[#10233f]/12 hover:border-[#2047a8]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {story.key && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2047a8]/10 text-[#2047a8] border border-[#2047a8]/20 font-mono">
                            {story.key}
                          </span>
                        )}
                        {story.points && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            {story.points} pts
                          </span>
                        )}
                        {story.url && (
                          <a
                            href={story.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-[#2047a8] hover:underline transition"
                            title="Open in external issue tracker"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                      <h3 className="text-xs font-bold text-[#10233f] line-clamp-2">
                        {story.title}
                      </h3>
                    </div>

                    {/* Active story indicator or Select button */}
                    <div className="flex items-center gap-1">
                      {isActive ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          Active
                        </span>
                      ) : (
                        isFacilitator && (
                          <button
                            onClick={() => onSelectStory(story.id)}
                            className="px-2 py-1 bg-[#2047a8] hover:bg-[#16347d] text-white rounded-lg text-[11px] font-bold transition shadow"
                          >
                            🎯 Estimate
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {story.description && (
                    <p className="text-[11px] text-[#5d6f88] line-clamp-2 font-medium">
                      {story.description}
                    </p>
                  )}

                  {/* Facilitator Item Controls */}
                  {isFacilitator && (
                    <div className="flex items-center justify-between pt-1 border-t border-[#10233f]/10 text-[10px] text-[#5d6f88]">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="px-1.5 py-0.5 hover:bg-[#edf3fb] hover:text-[#10233f] rounded transition disabled:opacity-20 font-bold"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === backlog.length - 1}
                          className="px-1.5 py-0.5 hover:bg-[#edf3fb] hover:text-[#10233f] rounded transition disabled:opacity-20 font-bold"
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
