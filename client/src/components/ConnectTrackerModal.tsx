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

export interface LinearState {
  apiKey: string;
  selectedTeam: string;
  selectedProject: string;
}

export interface GitHubState {
  pat: string;
  owner: string;
  repo: string;
  selectedMilestone: string;
}

export interface JiraState {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
  pointsField: string;
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

  const [linear, setLinear] = useState<LinearState>({
    apiKey: '',
    selectedTeam: '',
    selectedProject: '',
  });

  const [github, setGithub] = useState<GitHubState>({
    pat: '',
    owner: '',
    repo: '',
    selectedMilestone: '',
  });

  const [jira, setJira] = useState<JiraState>({
    domain: '',
    email: '',
    apiToken: '',
    projectKey: '',
    pointsField: 'customfield_10016',
  });

  const [rawMarkdown, setRawMarkdown] = useState('');

  // Load ephemeral credentials from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`scrum_poker:creds:${slug}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.linearApiKey) {
          setLinear((prev) => ({ ...prev, apiKey: parsed.linearApiKey }));
        }
        if (parsed.githubPat || parsed.githubOwner || parsed.githubRepo) {
          setGithub((prev) => ({
            ...prev,
            pat: parsed.githubPat || prev.pat,
            owner: parsed.githubOwner || prev.owner,
            repo: parsed.githubRepo || prev.repo,
          }));
        }
        if (parsed.jiraDomain || parsed.jiraEmail || parsed.jiraApiToken || parsed.jiraProjectKey) {
          setJira((prev) => ({
            ...prev,
            domain: parsed.jiraDomain || prev.domain,
            email: parsed.jiraEmail || prev.email,
            apiToken: parsed.jiraApiToken || prev.apiToken,
            projectKey: parsed.jiraProjectKey || prev.projectKey,
          }));
        }
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
          linearApiKey: linear.apiKey,
          githubPat: github.pat,
          githubOwner: github.owner,
          githubRepo: github.repo,
          jiraDomain: jira.domain,
          jiraEmail: jira.email,
          jiraApiToken: jira.apiToken,
          jiraProjectKey: jira.projectKey,
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
      if (!linear.apiKey.trim()) return null;
      return {
        provider: 'Linear',
        config: { api_key: linear.apiKey.trim() },
      };
    }
    if (tab === 'GitHub') {
      if (!github.pat.trim() || !github.owner.trim() || !github.repo.trim()) return null;
      return {
        provider: 'GitHub',
        config: {
          personal_access_token: github.pat.trim(),
          owner: github.owner.trim(),
          repo: github.repo.trim(),
        },
      };
    }
    if (tab === 'Jira') {
      if (!jira.domain.trim() || !jira.email.trim() || !jira.apiToken.trim() || !jira.projectKey.trim())
        return null;
      return {
        provider: 'Jira',
        config: {
          domain: jira.domain.trim(),
          email: jira.email.trim(),
          api_token: jira.apiToken.trim(),
          project_key: jira.projectKey.trim(),
          points_field: jira.pointsField.trim() || undefined,
        },
      };
    }
    return null;
  };

  const handleTestConnection = () => {
    onClearFeedback();
    const config = getCurrentConfig();
    if (config) {
      onTestConnection(config);
    }
  };

  const handleConnectAndFetch = () => {
    onClearFeedback();
    const config = getCurrentConfig();
    if (config) {
      onConnect(config);

      const query: TrackerQuery = {};
      if (tab === 'Linear') {
        if (linear.selectedTeam) query.team_id = linear.selectedTeam;
        if (linear.selectedProject) query.project_id = linear.selectedProject;
      } else if (tab === 'GitHub') {
        if (github.selectedMilestone) query.milestone = github.selectedMilestone;
      }
      onFetchBacklog(query);
      onClose();
    }
  };

  const handleImportMarkdown = () => {
    if (rawMarkdown.trim()) {
      onImportMarkdown(rawMarkdown);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#10233f]/55 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-tracker-modal-title"
        className="bg-white border border-[#10233f]/12 rounded-2xl w-full max-w-xl overflow-hidden shadow-[0_30px_60px_rgba(12,28,55,0.25)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#10233f]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚡</span>
            <div>
              <h2 id="connect-tracker-modal-title" className="text-lg font-bold text-[#10233f]">
                Backlog Ingestion & Tracker Sync
              </h2>
              <p className="text-xs text-[#5d6f88] font-medium">
                Zero-Auth ephemeral credentials stored in browser session memory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5d6f88] hover:text-[#10233f] text-lg p-1 rounded-lg hover:bg-[#edf3fb] transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#10233f]/10 bg-[#edf3fb] p-1.5 gap-1 text-xs font-bold">
          {(['Linear', 'GitHub', 'Jira', 'Markdown'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                onClearFeedback();
              }}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                tab === t
                  ? 'bg-[#2047a8] text-white shadow-sm'
                  : 'text-[#5d6f88] hover:text-[#10233f] hover:bg-white/60'
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
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs flex items-start gap-2 font-medium">
              <span className="text-sm">⚠️</span>
              <p className="flex-1">{trackerError}</p>
            </div>
          )}

          {activeProvider && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-xs flex items-center justify-between font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected Provider: <strong>{activeProvider}</strong></span>
              </div>
              {isFacilitator && (
                <button
                  onClick={onDisconnect}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-full text-[11px] font-bold transition border border-rose-300"
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
                <label className="block text-xs font-bold text-[#10233f] mb-1">
                  Linear Personal API Key <span className="text-[#2047a8]">*</span>
                </label>
                <input
                  type="password"
                  value={linear.apiKey}
                  onChange={(e) => setLinear((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="lin_api_..."
                  className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] focus:ring-2 focus:ring-[#2047a8]/20 text-xs font-mono"
                />
                <p className="text-[11px] text-[#5d6f88] mt-1 font-medium">
                  Created in Linear Settings &gt; API &gt; Personal API Keys.
                </p>
              </div>

              {connectionPreview?.provider === 'Linear' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-[#10233f] mb-1">
                      Filter Team (Optional)
                    </label>
                    <select
                      value={linear.selectedTeam}
                      onChange={(e) => setLinear((prev) => ({ ...prev, selectedTeam: e.target.value }))}
                      className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] text-xs font-medium"
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
                    <label className="block text-xs font-bold text-[#10233f] mb-1">
                      Filter Project (Optional)
                    </label>
                    <select
                      value={linear.selectedProject}
                      onChange={(e) => setLinear((prev) => ({ ...prev, selectedProject: e.target.value }))}
                      className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] text-xs font-medium"
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
                <label className="block text-xs font-bold text-[#10233f] mb-1">
                  GitHub Personal Access Token (PAT) <span className="text-[#2047a8]">*</span>
                </label>
                <input
                  type="password"
                  value={github.pat}
                  onChange={(e) => setGithub((prev) => ({ ...prev, pat: e.target.value }))}
                  placeholder="ghp_..."
                  className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] focus:ring-2 focus:ring-[#2047a8]/20 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10233f] mb-1">
                    Repo Owner <span className="text-[#2047a8]">*</span>
                  </label>
                  <input
                    type="text"
                    value={github.owner}
                    onChange={(e) => setGithub((prev) => ({ ...prev, owner: e.target.value }))}
                    placeholder="e.g. facebook"
                    className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] focus:ring-2 focus:ring-[#2047a8]/20 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#10233f] mb-1">
                    Repository <span className="text-[#2047a8]">*</span>
                  </label>
                  <input
                    type="text"
                    value={github.repo}
                    onChange={(e) => setGithub((prev) => ({ ...prev, repo: e.target.value }))}
                    placeholder="e.g. react"
                    className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] focus:ring-2 focus:ring-[#2047a8]/20 text-xs font-medium"
                  />
                </div>
              </div>

              {connectionPreview?.provider === 'GitHub' && connectionPreview.milestones.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-[#10233f] mb-1">
                    Filter Milestone (Optional)
                  </label>
                  <select
                    value={github.selectedMilestone}
                    onChange={(e) => setGithub((prev) => ({ ...prev, selectedMilestone: e.target.value }))}
                    className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] text-xs font-medium"
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
                  <label className="block text-xs font-bold text-[#10233f] mb-1">
                    Jira Domain <span className="text-[#2047a8]">*</span>
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={jira.domain}
                      onChange={(e) => setJira((prev) => ({ ...prev, domain: e.target.value }))}
                      placeholder="my-company"
                      className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-l-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] text-xs font-medium"
                    />
                    <span className="bg-[#edf3fb] border border-l-0 border-[#10233f]/15 rounded-r-xl px-2 py-2 text-[#5d6f88] text-xs font-semibold">
                      .atlassian.net
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#10233f] mb-1">
                    Project Key <span className="text-[#2047a8]">*</span>
                  </label>
                  <input
                    type="text"
                    value={jira.projectKey}
                    onChange={(e) => setJira((prev) => ({ ...prev, projectKey: e.target.value }))}
                    placeholder="e.g. PROJ"
                    className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] text-xs uppercase font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10233f] mb-1">
                  Atlassian Account Email <span className="text-[#2047a8]">*</span>
                </label>
                <input
                  type="email"
                  value={jira.email}
                  onChange={(e) => setJira((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@company.com"
                  className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10233f] mb-1">
                  Jira API Token <span className="text-[#2047a8]">*</span>
                </label>
                <input
                  type="password"
                  value={jira.apiToken}
                  onChange={(e) => setJira((prev) => ({ ...prev, apiToken: e.target.value }))}
                  placeholder="Generated from id.atlassian.com/manage-profile/security/api-tokens"
                  className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10233f] mb-1">
                  Story Points Custom Field (Optional)
                </label>
                <input
                  type="text"
                  value={jira.pointsField}
                  onChange={(e) => setJira((prev) => ({ ...prev, pointsField: e.target.value }))}
                  placeholder="customfield_10016"
                  className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Markdown Paste Tab */}
          {tab === 'Markdown' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#10233f] mb-1">
                  Paste Markdown Stories / Backlog
                </label>
                <textarea
                  rows={8}
                  value={rawMarkdown}
                  onChange={(e) => setRawMarkdown(e.target.value)}
                  placeholder={`# Story 1: User Profile Settings\nAllow users to edit profile and upload avatar.\n\n### Acceptance Criteria\n- [ ] Upload avatar image\n- [ ] Persist bio across sessions\n\n# Story 2: Billing & Checkout\nImplement Stripe checkout session.\n- [ ] Support credit card and Apple Pay`}
                  className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl p-3 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] text-xs font-mono resize-none"
                />
                <p className="text-[11px] text-[#5d6f88] mt-1 font-medium">
                  Automatically parses titles (`#`), descriptions, and acceptance criteria checklists (`- [ ]`).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#10233f]/10 bg-[#f9fbff] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-bold text-[#5d6f88] hover:text-[#10233f] hover:bg-[#edf3fb] transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {tab !== 'Markdown' ? (
              <>
                <button
                  onClick={handleTestConnection}
                  disabled={!getCurrentConfig()}
                  className="px-3.5 py-2 rounded-full text-xs font-bold bg-[#edf3fb] hover:bg-[#e2ebf7] text-[#10233f] border border-[#10233f]/12 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  🔍 Test Connection
                </button>
                <button
                  onClick={handleConnectAndFetch}
                  disabled={!getCurrentConfig()}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-[#2047a8] to-[#16347d] hover:from-[#16347d] hover:to-[#10233f] text-white shadow-md shadow-[#2047a8]/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ⚡ Connect &amp; Import
                </button>
              </>
            ) : (
              <button
                onClick={handleImportMarkdown}
                disabled={!rawMarkdown.trim()}
                className="px-4 py-2 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
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
