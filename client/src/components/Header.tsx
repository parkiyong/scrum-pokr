import React, { useState } from 'react';
import { Check, Copy, Crown, Eye, Share2, User } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-soft px-4 sm:px-6 py-2.5 flex items-center justify-between transition-all">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-3">
        <a
          href="/"
          className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-base text-white shadow-sm shadow-blue-500/20 hover:scale-105 active:scale-95 transition-transform"
          title="Back to Home"
        >
          🃏
        </a>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-black text-sm tracking-tight text-slate-900 hidden sm:inline">
              Scrum Pokr AI
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg">
                {slug}
              </span>
              <button
                onClick={handleShare}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Copy Room Link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>{status === 'connected' ? 'Live WebSocket' : 'Connecting...'}</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Share</span>
            </>
          )}
        </button>

        {/* User Profile Pill */}
        {myParticipant ? (
          <button
            onClick={onChangeProfile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-soft transition-all active:scale-95 text-xs font-semibold group"
            title="Edit Profile"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
              {myParticipant.nickname.charAt(0).toUpperCase()}
            </div>
            <span className="max-w-[120px] truncate">{myParticipant.nickname}</span>
            {isFacilitator && (
              <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            )}
            {myParticipant.role === 'Observer' && (
              <Eye className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            )}
          </button>
        ) : (
          <button
            onClick={onChangeProfile}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>Join Table</span>
          </button>
        )}
      </div>
    </header>
  );
};
