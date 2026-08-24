import React, { useState } from 'react';

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
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Brand Heading */}
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-md text-2xl font-black mb-1 text-white">
            🃏
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Scrum Pokr <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto font-normal">
            Zero-auth real-time Planning Poker with server-enforced reveal gates and AI estimation advisory.
          </p>
        </div>

        {/* Action Cards */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(15,23,42,0.06)] space-y-5 text-left">
          {/* Quick Create Room */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-1">
              Create New Room
            </h2>
            <p className="text-xs text-slate-500 mb-3.5">
              Instantly spin up an ephemeral room with a 6-character room code (e.g. SWB-42).
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              {showCustom ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="e.g. SPRINT-42"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none font-mono uppercase font-semibold"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCustom(false)}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                    >
                      ← Back to Auto Code
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                >
                  + Custom room code override
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Room...' : 'Create Room Instantly'}
              </button>
            </form>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-100 w-full" />
            <span className="bg-slate-100 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-500 absolute">
              or
            </span>
          </div>

          {/* Join Existing Room */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 mb-1">
              Join Existing Room
            </h2>
            <form onSubmit={handleJoin} className="space-y-2.5">
              <input
                type="text"
                placeholder="Enter room code (e.g. SWB-42)"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none font-mono uppercase font-semibold"
              />
              <button
                type="submit"
                disabled={!joinInput.trim()}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs sm:text-sm shadow-xs transition active:scale-98 disabled:opacity-50"
              >
                Enter Room →
              </button>
            </form>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600 font-semibold">
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-xs">
            Zero-Auth
          </span>
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-xs">
            Server Reveal Gate
          </span>
          <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-md shadow-xs">
            AI Story Doctor
          </span>
        </div>
      </div>
    </div>
  );
};

