import React, { useState, useEffect } from 'react';
import { ConnectionPreview, Story, TrackerConfig, TrackerProvider, TrackerQuery } from '../types/room';

interface ConnectTrackerModalProps {
  isOpen: boolean;
  slug: string;
  isFacilitator: boolean;
  activeProvider?: string;
  connectionPreview: ConnectionPreview | null;
  trackerError: string | null;
  onConnect: (config: TrackerConfig) => void;
  onDisconnect: () => void;
  onTestConnection: (config: TrackerConfig) => void;
  onFetchBacklog: (query: TrackerQuery) => void;
  onImportMarkdown: (markdown: string) => void;
  onImportBacklog: (stories: Story[]) => void;
  onClose: () => void;
  onClearFeedback: () => void;
}

export const ConnectTrackerModal: React.FC<ConnectTrackerModalProps> = ({
  isOpen,
  slug,
  isFacilitator,
  activeProvider,
  connectionPreview,
  trackerError,
  onConnect,
  onDisconnect,
  onTestConnection,
  onFetchBacklog,
  onImportMarkdown,
  onClose,
  onClearFeedback,
}) => {
  const [tab, setTab] = useState<TrackerProvider | 'Markdown'>('Linear');

  // Linear fields
  const [linearApiKey, setLinearApiKey] = useState('');
  const [selectedLinearTeam, setSelectedLinearTeam] = useState('');
  const [selectedLinearProject, setSelectedLinearProject] = useState('');

  // GitHub fields
  const [githubPat, setGithubPat] = useState('');
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [selectedGithubMilestone, setSelectedGithubMilestone] = useState('');

  // Jira fields
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('');
  const [jiraPointsField, setJiraPointsField] = useState('customfield_10016');

  // Markdown paste
  const [rawMarkdown, setRawMarkdown] = useState('');

  // Load ephemeral credentials from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`scrum_poker:creds:${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.linearApiKey) setLinearApiKey(parsed.linearApiKey);
        if (parsed.githubPat) setGithubPat(parsed.githubPat);
        if (parsed.githubOwner) setGithubOwner(parsed.githubOwner);
        if (parsed.githubRepo) setGithubRepo(parsed.githubRepo);
        if (parsed.jiraDomain) setJiraDomain(parsed.jiraDomain);
        if (parsed.jiraEmail) setJiraEmail(parsed.jiraEmail);
        if (parsed.jiraApiToken) setJiraApiToken(parsed.jiraApiToken);
        if (parsed.jiraProjectKey) setJiraProjectKey(parsed.jiraProjectKey);
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }, [slug]);

  // Save to sessionStorage
  const saveCreds = () => {
    try {
      sessionStorage.setItem(
        `scrum_poker:creds:${slug}`,
        JSON.stringify({
          linearApiKey,
          githubPat,
          githubOwner,
          githubRepo,
          jiraDomain,
          jiraEmail,
          jiraApiToken,
          jiraProjectKey,
        })
      );
    } catch {
      // Ignore
    }
  };

  // Save credentials to sessionStorage ONLY after connection authentication is confirmed live
  useEffect(() => {
    if (activeProvider || connectionPreview?.authenticated) {
      saveCreds();
    }
  }, [activeProvider, connectionPreview?.authenticated]);

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

  if (!isOpen) return null;

  const getCurrentConfig = (): TrackerConfig | null => {
    if (tab === 'Linear') {
      if (!linearApiKey.trim()) return null;
      return {
        provider: 'Linear',
        config: { api_key: linearApiKey.trim() },
      };
    }
    if (tab === 'GitHub') {
      if (!githubPat.trim() || !githubOwner.trim() || !githubRepo.trim()) return null;
      return {
        provider: 'GitHub',
        config: {
          personal_access_token: githubPat.trim(),
          owner: githubOwner.trim(),
          repo: githubRepo.trim(),
        },
      };
    }
    if (tab === 'Jira') {
      if (!jiraDomain.trim() || !jiraEmail.trim() || !jiraApiToken.trim() || !jiraProjectKey.trim())
        return null;
      return {
        provider: 'Jira',
        config: {
          domain: jiraDomain.trim(),
          email: jiraEmail.trim(),
          api_token: jiraApiToken.trim(),
          project_key: jiraProjectKey.trim(),
          points_field: jiraPointsField.trim() || undefined,
        },
      };
    }
    return null;
  };

  const handleTestConnection = () => {
    onClearFeedback();
    const config = getCurrentConfig();
    if (config) {
      // Do NOT save credentials here — only save after a confirmed live connection.
      onTestConnection(config);
    }
  };

  const handleConnect = () => {
    onClearFeedback();
    const config = getCurrentConfig();
    if (config) {
      onConnect(config);
    }
  };

  const handleConnectAndFetch = () => {
    onClearFeedback();
    const config = getCurrentConfig();
    if (config) {
      onConnect(config);

      const query: TrackerQuery = {};
      if (tab === 'Linear') {
        if (selectedLinearTeam) query.team_id = selectedLinearTeam;
        if (selectedLinearProject) query.project_id = selectedLinearProject;
      } else if (tab === 'GitHub') {
        if (selectedGithubMilestone) query.milestone = selectedGithubMilestone;
      }
      onFetchBacklog(query);
      onClose();
    }
  };

  const handleFetchBacklog = () => {
    if (tab === 'Linear') {
      onFetchBacklog({
        team_id: selectedLinearTeam || undefined,
        project_id: selectedLinearProject || undefined,
      });
    } else if (tab === 'GitHub') {
      onFetchBacklog({
        milestone: selectedGithubMilestone || undefined,
      });
    } else if (tab === 'Jira') {
      onFetchBacklog({});
    }
    onClose();
  };

  const handleImportMarkdown = () => {
    if (rawMarkdown.trim()) {
      onImportMarkdown(rawMarkdown);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-tracker-modal-title"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚡</span>
            <div>
              <h2 id="connect-tracker-modal-title" className="text-lg font-bold text-white">
                Backlog Ingestion & Tracker Sync
              </h2>
              <p className="text-xs text-slate-400">
                Zero-Auth ephemeral credentials stored in browser session memory
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1 text-xs font-semibold">
          {(['Linear', 'GitHub', 'Jira', 'Markdown'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                onClearFeedback();
              }}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                tab === t
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {t === 'Linear' && '📐 Linear'}
              {t === 'GitHub' && '🐙 GitHub'}
              {t === 'Jira' && '🔷 Jira'}
              {t === 'Markdown' && '📝 Markdown / Paste'}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          {trackerError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <p className="flex-1">{trackerError}</p>
            </div>
          )}

          {activeProvider && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected Provider: <strong>{activeProvider}</strong></span>
              </div>
              {isFacilitator && (
                <button
                  onClick={onDisconnect}
                  className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-[11px] font-semibold transition"
                >
                  Disconnect
                </button>
              )}
            </div>
          )}

          {/* Linear Tab */}
          {tab === 'Linear' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Linear Personal API Key <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="password"
                  value={linearApiKey}
                  onChange={(e) => setLinearApiKey(e.target.value)}
                  placeholder="lin_api_..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Created in Linear Settings &gt; API &gt; Personal API Keys.
                </p>
              </div>

              {connectionPreview?.provider === 'Linear' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Filter Team (Optional)
                    </label>
                    <select
                      value={selectedLinearTeam}
                      onChange={(e) => setSelectedLinearTeam(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                    >
                      <option value="">All Teams</option>
                      {connectionPreview.teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.extra || t.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Filter Project (Optional)
                    </label>
                    <select
                      value={selectedLinearProject}
                      onChange={(e) => setSelectedLinearProject(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                    >
                      <option value="">All Projects</option>
                      {connectionPreview.projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GitHub Tab */}
          {tab === 'GitHub' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  GitHub Personal Access Token (PAT) <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="password"
                  value={githubPat}
                  onChange={(e) => setGithubPat(e.target.value)}
                  placeholder="ghp_..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Repo Owner <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={githubOwner}
                    onChange={(e) => setGithubOwner(e.target.value)}
                    placeholder="e.g. facebook"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Repository <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="e.g. react"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                  />
                </div>
              </div>

              {connectionPreview?.provider === 'GitHub' && connectionPreview.milestones.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Filter Milestone (Optional)
                  </label>
                  <select
                    value={selectedGithubMilestone}
                    onChange={(e) => setSelectedGithubMilestone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                  >
                    <option value="">All Milestones</option>
                    {connectionPreview.milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (#{m.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Jira Tab */}
          {tab === 'Jira' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Jira Domain <span className="text-indigo-400">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={jiraDomain}
                      onChange={(e) => setJiraDomain(e.target.value)}
                      placeholder="my-company"
                      className="w-full bg-slate-950 border border-slate-700 rounded-l-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                    <span className="bg-slate-800 border border-l-0 border-slate-700 rounded-r-xl px-2 py-2 text-slate-400 text-xs">
                      .atlassian.net
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Project Key <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={jiraProjectKey}
                    onChange={(e) => setJiraProjectKey(e.target.value)}
                    placeholder="e.g. PROJ"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Atlassian Account Email <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="email"
                  value={jiraEmail}
                  onChange={(e) => setJiraEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Jira API Token <span className="text-indigo-400">*</span>
                </label>
                <input
                  type="password"
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  placeholder="Generated from id.atlassian.com/manage-profile/security/api-tokens"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Story Points Custom Field (Optional)
                </label>
                <input
                  type="text"
                  value={jiraPointsField}
                  onChange={(e) => setJiraPointsField(e.target.value)}
                  placeholder="customfield_10016"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>
            </div>
          )}

          {/* Markdown Paste Tab */}
          {tab === 'Markdown' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paste Markdown Stories / Backlog
                </label>
                <textarea
                  rows={8}
                  value={rawMarkdown}
                  onChange={(e) => setRawMarkdown(e.target.value)}
                  placeholder={`# Story 1: User Profile Settings\nAllow users to edit profile and upload avatar.\n\n### Acceptance Criteria\n- [ ] Upload avatar image\n- [ ] Persist bio across sessions\n\n# Story 2: Billing & Checkout\nImplement Stripe checkout session.\n- [ ] Support credit card and Apple Pay`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 text-xs font-mono resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Automatically parses titles (`#`), descriptions, and acceptance criteria checklists (`- [ ]`).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {tab !== 'Markdown' ? (
              <>
                <button
                  onClick={handleTestConnection}
                  disabled={!getCurrentConfig()}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🔍 Test Connection
                </button>
                <button
                  onClick={handleConnectAndFetch}
                  disabled={!getCurrentConfig()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ⚡ Connect &amp; Import
                </button>
              </>
            ) : (
              <button
                onClick={handleImportMarkdown}
                disabled={!rawMarkdown.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                📥 Import Stories
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
