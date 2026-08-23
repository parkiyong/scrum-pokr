import React, { useState } from 'react';
import { Participant } from '../types/room';

interface HeaderProps {
  slug: string;
  shortCode?: string;
  myParticipant?: Participant;
  isFacilitator: boolean;
  status: string;
  onChangeProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  slug,
  myParticipant,
  isFacilitator,
  status,
  onChangeProfile,
}) => {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="border-b border-[#10233f]/12 bg-white/88 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 shadow-[0_14px_34px_rgba(18,42,82,0.08)]">
      <div className="flex items-center gap-3">
        <a href="/" className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#2047a8] to-[#7f1d7a] flex items-center justify-center font-bold text-lg text-white shadow-md shadow-[#2047a8]/20 hover:scale-105 transition">
          🃏
        </a>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm tracking-wide text-[#10233f]">Scrum Pokr AI</h1>
            <span className="px-2.5 py-0.5 text-xs bg-[#2047a8]/10 text-[#2047a8] border border-[#2047a8]/20 rounded-full font-mono font-bold tracking-wider">
              {slug}
            </span>
          </div>
          <p className="text-[11px] text-[#5d6f88] font-medium">Zero-Auth Room • Standalone Mode</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="text-xs bg-[#edf3fb] hover:bg-[#e2ebf7] border border-[#10233f]/12 px-3 py-1.5 rounded-full transition text-[#10233f] font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <span>{copied ? '✓ Copied!' : `🔗 Share (${slug})`}</span>
        </button>

        {/* User Badge */}
        {myParticipant ? (
          <button
            onClick={onChangeProfile}
            className="flex items-center gap-2 text-xs bg-[#edf3fb] hover:bg-[#e2ebf7] border border-[#10233f]/12 px-3 py-1.5 rounded-full transition shadow-sm"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-semibold text-[#10233f]">
              {myParticipant.nickname}{' '}
              {isFacilitator
                ? myParticipant.role === 'Observer'
                  ? '(Facilitator • Observer)'
                  : '(Facilitator)'
                : `(${myParticipant.role})`}
            </span>
          </button>
        ) : (
          <button
            onClick={onChangeProfile}
            className="text-xs bg-[#2047a8] hover:bg-[#16347d] text-white px-3 py-1.5 rounded-full transition font-bold shadow-md shadow-[#2047a8]/20"
          >
            Join Table
          </button>
        )}
      </div>
    </header>
  );
};
