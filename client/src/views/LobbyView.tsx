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
      <div className="max-w-lg w-full text-center space-y-8">
        {/* Brand Heading */}
        <div className="space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#2047a8] via-[#16347d] to-[#7f1d7a] shadow-xl shadow-[#2047a8]/25 text-3xl font-black mb-2 animate-bounce-slow text-white">
            🃏
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#10233f]">
            Scrum Pokr <span className="text-[#2047a8]">AI</span>
          </h1>
          <p className="text-sm text-[#5d6f88] max-w-sm mx-auto font-medium">
            Zero-auth, real-time Planning Poker with server-enforced reveal gates and AI estimation advisory.
          </p>
        </div>

        {/* Action Cards */}
        <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/12 rounded-3xl p-6 sm:p-8 shadow-[0_24px_60px_rgba(18,42,82,0.12)] space-y-6 text-left">
          {/* Quick Create Room */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#2047a8] mb-1.5">
              Create New Room
            </h2>
            <p className="text-xs text-[#5d6f88] mb-4">
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
                    className="w-full bg-[#f9fbff] border border-[#10233f]/15 focus:border-[#2047a8] focus:ring-2 focus:ring-[#2047a8]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#10233f] placeholder-[#5d6f88]/60 outline-none font-mono uppercase font-semibold"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCustom(false)}
                      className="text-xs text-[#5d6f88] hover:text-[#10233f] font-medium"
                    >
                      ← Back to Auto Code
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  className="text-xs text-[#2047a8] hover:text-[#16347d] font-bold"
                >
                  + Custom room code override
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-gradient-to-r from-[#2047a8] to-[#16347d] hover:from-[#16347d] hover:to-[#10233f] text-white font-bold text-sm shadow-lg shadow-[#2047a8]/25 transition active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Room...' : '⚡ Create Room Instantly'}
              </button>
            </form>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#10233f]/10 w-full" />
            <span className="bg-[#edf3fb] px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-widest text-[#5d6f88] absolute border border-[#10233f]/10">
              or
            </span>
          </div>

          {/* Join Existing Room */}
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#7f1d7a] mb-1.5">
              Join Existing Room
            </h2>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="Enter room code (e.g. SWB-42)"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                className="w-full bg-[#f9fbff] border border-[#10233f]/15 focus:border-[#7f1d7a] focus:ring-2 focus:ring-[#7f1d7a]/20 rounded-xl px-3.5 py-2.5 text-sm text-[#10233f] placeholder-[#5d6f88]/60 outline-none font-mono uppercase font-semibold"
              />
              <button
                type="submit"
                disabled={!joinInput.trim()}
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#7f1d7a] to-[#9c2768] hover:opacity-95 text-white font-bold text-sm shadow-md shadow-[#7f1d7a]/20 transition active:scale-98 disabled:opacity-50"
              >
                Enter Room →
              </button>
            </form>
          </div>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#5d6f88] font-semibold">
          <span className="flex items-center gap-1.5 bg-white/80 border border-[#10233f]/10 px-3 py-1 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Zero-Auth
          </span>
          <span className="flex items-center gap-1.5 bg-white/80 border border-[#10233f]/10 px-3 py-1 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#2047a8]" />
            Server Reveal Gate
          </span>
          <span className="flex items-center gap-1.5 bg-white/80 border border-[#10233f]/10 px-3 py-1 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#7f1d7a]" />
            3D Card Reveal
          </span>
          <span className="flex items-center gap-1.5 bg-white/80 border border-[#10233f]/10 px-3 py-1 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Tokio Real-Time
          </span>
        </div>
      </div>
    </div>
  );
};
