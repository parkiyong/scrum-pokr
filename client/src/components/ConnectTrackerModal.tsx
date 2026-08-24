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
  const [showLinearKey, setShowLinearKey] = useState(false);
  const [showGithubPat, setShowGithubPat] = useState(false);
  const [showJiraToken, setShowJiraToken] = useState(false);

  const pasteFromClipboard = async (onPasted: (text: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onPasted(text.trim());
      }
    } catch {
      // Browser clipboard permission denied or not supported
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-tracker-modal-title"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚡</span>
            <div>
              <h2 id="connect-tracker-modal-title" className="text-base font-bold text-slate-900">
                Backlog Ingestion &amp; Tracker Sync
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Zero-Auth ephemeral credentials stored in browser session memory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1 text-xs font-bold">
          {(['Linear', 'GitHub', 'Jira', 'Markdown'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                onClearFeedback();
              }}
              className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                tab === t
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#10233f]">
                    Linear Personal API Key <span className="text-[#2047a8]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard((text) => setLinear((prev) => ({ ...prev, apiKey: text })))}
                    className="text-[11px] font-bold text-[#2047a8] hover:text-[#16347d] bg-[#edf3fb] hover:bg-[#dfeaf8] px-2 py-0.5 rounded-md transition flex items-center gap-1 border border-[#2047a8]/20"
                  >
                    📋 Paste
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLinearKey ? 'text' : 'password'}
                    value={linear.apiKey}
                    onChange={(e) => setLinear((prev) => ({ ...prev, apiKey: e.target.value.trim() }))}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        e.preventDefault();
                        setLinear((prev) => ({ ...prev, apiKey: text.trim() }));
                      }
                    }}
                    placeholder="lin_api_..."
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl pl-3 pr-9 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] focus:ring-2 focus:ring-[#2047a8]/20 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLinearKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5d6f88] hover:text-[#10233f] p-1"
                    title={showLinearKey ? 'Hide key' : 'Show key'}
                    aria-label={showLinearKey ? 'Hide key' : 'Show key'}
                  >
                    {showLinearKey ? '🙈' : '👁️'}
                  </button>
                </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#10233f]">
                    GitHub Personal Access Token (PAT) <span className="text-[#2047a8]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard((text) => setGithub((prev) => ({ ...prev, pat: text })))}
                    className="text-[11px] font-bold text-[#2047a8] hover:text-[#16347d] bg-[#edf3fb] hover:bg-[#dfeaf8] px-2 py-0.5 rounded-md transition flex items-center gap-1 border border-[#2047a8]/20"
                  >
                    📋 Paste
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showGithubPat ? 'text' : 'password'}
                    value={github.pat}
                    onChange={(e) => setGithub((prev) => ({ ...prev, pat: e.target.value.trim() }))}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        e.preventDefault();
                        setGithub((prev) => ({ ...prev, pat: text.trim() }));
                      }
                    }}
                    placeholder="ghp_..."
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl pl-3 pr-9 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] focus:ring-2 focus:ring-[#2047a8]/20 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGithubPat((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5d6f88] hover:text-[#10233f] p-1"
                    title={showGithubPat ? 'Hide token' : 'Show token'}
                    aria-label={showGithubPat ? 'Hide token' : 'Show token'}
                  >
                    {showGithubPat ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#10233f] mb-1">
                    Repo Owner <span className="text-[#2047a8]">*</span>
                  </label>
                  <input
                    type="text"
                    value={github.owner}
                    onChange={(e) => setGithub((prev) => ({ ...prev, owner: e.target.value.trim() }))}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        e.preventDefault();
                        setGithub((prev) => ({ ...prev, owner: text.trim() }));
                      }
                    }}
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
                    onChange={(e) => setGithub((prev) => ({ ...prev, repo: e.target.value.trim() }))}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        e.preventDefault();
                        setGithub((prev) => ({ ...prev, repo: text.trim() }));
                      }
                    }}
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
                      onChange={(e) => setJira((prev) => ({ ...prev, domain: e.target.value.trim() }))}
                      onPaste={(e) => {
                        const text = e.clipboardData.getData('text');
                        if (text) {
                          e.preventDefault();
                          // Support full URL or subdomain paste
                          const cleaned = text.trim().replace(/^https?:\/\//, '').replace(/\.atlassian\.net.*$/, '');
                          setJira((prev) => ({ ...prev, domain: cleaned }));
                        }
                      }}
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
                    onChange={(e) => setJira((prev) => ({ ...prev, projectKey: e.target.value.trim().toUpperCase() }))}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        e.preventDefault();
                        setJira((prev) => ({ ...prev, projectKey: text.trim().toUpperCase() }));
                      }
                    }}
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
                  onChange={(e) => setJira((prev) => ({ ...prev, email: e.target.value.trim() }))}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (text) {
                      e.preventDefault();
                      setJira((prev) => ({ ...prev, email: text.trim() }));
                    }
                  }}
                  placeholder="name@company.com"
                  className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl px-3 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] text-xs font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#10233f]">
                    Jira API Token <span className="text-[#2047a8]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard((text) => setJira((prev) => ({ ...prev, apiToken: text })))}
                    className="text-[11px] font-bold text-[#2047a8] hover:text-[#16347d] bg-[#edf3fb] hover:bg-[#dfeaf8] px-2 py-0.5 rounded-md transition flex items-center gap-1 border border-[#2047a8]/20"
                  >
                    📋 Paste
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showJiraToken ? 'text' : 'password'}
                    value={jira.apiToken}
                    onChange={(e) => setJira((prev) => ({ ...prev, apiToken: e.target.value.trim() }))}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData('text');
                      if (text) {
                        e.preventDefault();
                        setJira((prev) => ({ ...prev, apiToken: text.trim() }));
                      }
                    }}
                    placeholder="Generated from id.atlassian.com/manage-profile/security/api-tokens"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-[#f9fbff] border border-[#10233f]/15 rounded-xl pl-3 pr-9 py-2 text-[#10233f] placeholder-[#5d6f88]/60 focus:outline-none focus:border-[#2047a8] text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowJiraToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#5d6f88] hover:text-[#10233f] p-1"
                    title={showJiraToken ? 'Hide token' : 'Show token'}
                    aria-label={showJiraToken ? 'Hide token' : 'Show token'}
                  >
                    {showJiraToken ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#10233f] mb-1">
                  Story Points Custom Field (Optional)
                </label>
                <input
                  type="text"
                  value={jira.pointsField}
                  onChange={(e) => setJira((prev) => ({ ...prev, pointsField: e.target.value.trim() }))}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#10233f]">
                    Paste Markdown Stories / Backlog
                  </label>
                  <button
                    type="button"
                    onClick={() => pasteFromClipboard((text) => setRawMarkdown(text))}
                    className="text-[11px] font-bold text-[#2047a8] hover:text-[#16347d] bg-[#edf3fb] hover:bg-[#dfeaf8] px-2 py-0.5 rounded-md transition flex items-center gap-1 border border-[#2047a8]/20"
                  >
                    📋 Paste Clipboard
                  </button>
                </div>
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
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {tab !== 'Markdown' ? (
              <>
                <button
                  onClick={handleTestConnection}
                  disabled={!getCurrentConfig()}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                >
                  🔍 Test Connection
                </button>
                <button
                  onClick={handleConnectAndFetch}
                  disabled={!getCurrentConfig()}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ⚡ Connect &amp; Import
                </button>
              </>
            ) : (
              <button
                onClick={handleImportMarkdown}
                disabled={!rawMarkdown.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
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
