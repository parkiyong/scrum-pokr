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
    <header className="border-b border-blue-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-[90%] mx-auto px-2 sm:px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="h-8 w-8 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center font-bold text-base text-white shadow-xs transition"
            title="Home"
          >
            🃏
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-slate-900">Scrum Pokr AI</h1>
              <span className="px-2 py-0.2 rounded-md text-[11px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {slug}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="text-xs bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition text-slate-700 font-semibold flex items-center gap-1 shadow-xs"
          >
            <span>{copied ? '✓ Copied!' : `🔗 Share (${slug})`}</span>
          </button>

          {/* User Badge */}
          {myParticipant ? (
            <button
              onClick={onChangeProfile}
              className="flex items-center gap-2 text-xs bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl transition shadow-xs"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span className="font-bold text-slate-800">
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
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl transition font-bold shadow-xs"
            >
              Join Table
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

