import React, { useState } from 'react';
import { ArrowRight, Lock, Radio, Scissors, ShieldCheck, Sparkles, Zap } from 'lucide-react';

interface LobbyViewProps {
  onJoinRoom: (slugOrCode: string) => void;
  onCreateRoom: (customSlug?: string) => Promise<void>;
  loading: boolean;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onJoinRoom,
  onCreateRoom,
  loading,
}) => {
  const [joinInput, setJoinInput] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinInput.trim()) {
      onJoinRoom(joinInput.trim().toUpperCase());
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(customSlug.trim().toUpperCase() || undefined);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between p-4 sm:p-6 md:p-10 selection:bg-blue-600 selection:text-white">
      {/* Top Brand Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center text-xl text-white shadow-md shadow-blue-500/20 ring-1 ring-white/40">
            🃏
          </div>
          <div className="flex flex-col">
            <span className="font-display font-black text-base text-slate-900 tracking-tight leading-none">
              Scrum Pokr <span className="text-blue-600">AI</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 font-semibold tracking-wider">v0.1.0</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[11px] font-semibold text-blue-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Zero-Auth Standalone</span>
          </div>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="max-w-4xl w-full mx-auto my-auto py-8 sm:py-12 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/80 shadow-soft text-xs font-semibold text-slate-700 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Server-Enforced Reveal Gate &amp; SPIDR AI Slicing</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.08] font-display">
            Real-time planning poker for <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">high-velocity</span> teams.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto font-normal leading-relaxed">
            Zero signups, instant ephemeral rooms, anti-bias voting gates, and one-click sync to Linear, GitHub, and Jira.
          </p>
        </div>

        {/* Action Panel Grid */}
        <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Create Room */}
          <section className="glass-panel-elevated rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-colors" />

            <div className="space-y-3 mb-6 relative">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 font-bold shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                Create New Room
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Spin up a clean session instantly. Share the generated room link with your engineering team.
              </p>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 relative">
              {showCustom ? (
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. SPRINT-42"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50/80 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 outline-none uppercase tracking-wider transition"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustom(false);
                        setCustomSlug('');
                      }}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
                    >
                      ← Use auto-generated code
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCustom(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition"
                  >
                    + Custom room code override
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group/btn"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Spinning up room...</span>
                  </>
                ) : (
                  <>
                    <span>Create Room Instantly</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Card 2: Join Room */}
          <section className="glass-panel-elevated rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors" />

            <div className="space-y-3 mb-6 relative">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 font-bold shadow-sm">
                <Radio className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                Join Existing Room
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Enter an existing room code or short slug (e.g. <span className="font-mono text-slate-700 font-semibold">SWB-42</span>) to join live.
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-3 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter room code..."
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50/80 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 outline-none uppercase tracking-wider transition"
                />
              </div>

              <button
                type="submit"
                disabled={!joinInput.trim()}
                className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md shadow-slate-900/20 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn"
              >
                <span>Enter Room</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>
            </form>
          </section>
        </div>

        {/* Feature Highlights Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mt-8">
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/70 border border-slate-200/70 shadow-soft text-xs text-slate-700 font-semibold backdrop-blur-sm">
            <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="truncate">Zero-Auth Ephemeral</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/70 border border-slate-200/70 shadow-soft text-xs text-slate-700 font-semibold backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate">Server Reveal Gate</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/70 border border-slate-200/70 shadow-soft text-xs text-slate-700 font-semibold backdrop-blur-sm">
            <Scissors className="w-4 h-4 text-violet-600 flex-shrink-0" />
            <span className="truncate">SPIDR Story Slicing</span>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/70 border border-slate-200/70 shadow-soft text-xs text-slate-700 font-semibold backdrop-blur-sm">
            <Radio className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="truncate">Tokio WebSockets</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium pt-6 border-t border-slate-200/60">
        <p className="flex items-center gap-1.5">
          <span>Scrum Pokr AI — MIT Licensed open source planning suite.</span>
        </p>
        <div className="flex items-center gap-4 text-slate-600 font-semibold">
          <span className="text-[11px] text-slate-400">No cookies • No tracking • Memory-only state</span>
        </div>
      </footer>
    </div>
  );
};

