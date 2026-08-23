import React, { useState } from 'react';
import { Check, Eye, Users } from 'lucide-react';
import { Role } from '../types/room';

interface JoinModalProps {
  initialNickname?: string;
  initialAvatar?: string;
  initialRole?: Role;
  isOpen: boolean;
  onJoin: (nickname: string, avatar: string, role: Role) => void;
  onClose?: () => void;
}

const AVATAR_COLORS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-blue-600', ring: 'ring-blue-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-600', ring: 'ring-emerald-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-600', ring: 'ring-amber-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-600', ring: 'ring-rose-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-600', ring: 'ring-cyan-500' },
  { id: 'violet', label: 'Violet', bg: 'bg-violet-600', ring: 'ring-violet-500' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-600', ring: 'ring-slate-500' },
];

export const JoinModal: React.FC<JoinModalProps> = ({
  initialNickname = '',
  initialAvatar = 'indigo',
  initialRole = 'Estimator',
  isOpen,
  onJoin,
}) => {
  const [nickname, setNickname] = useState(initialNickname || '');
  const [avatar, setAvatar] = useState(initialAvatar || 'indigo');
  const [role, setRole] = useState<Role>(initialRole || 'Estimator');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    onJoin(nickname.trim(), avatar, role);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-modal animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-xl text-white shadow-sm shadow-blue-500/20">
            🃏
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 leading-none">
              Join Poker Room
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Zero-auth session • Reconnect anytime</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex, Sarah, Devon"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Avatar Color
            </label>
            <div className="flex items-center gap-2.5 pt-0.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAvatar(c.id)}
                  className={`w-8 h-8 rounded-full ${c.bg} transition-all duration-150 flex items-center justify-center ${
                    avatar === c.id
                      ? `ring-4 ring-blue-500/30 scale-110 shadow-sm`
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                >
                  {avatar === c.id && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Participation Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setRole('Estimator')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition text-left flex flex-col gap-0.5 ${
                  role === 'Estimator'
                    ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Estimator</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">Votes on story points</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Observer')}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition text-left flex flex-col gap-0.5 ${
                  role === 'Observer'
                    ? 'bg-violet-50/80 border-violet-400 text-violet-900 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-violet-600" />
                  <span>Observer</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">Watches without voting</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!nickname.trim()}
            className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition active:scale-98"
          >
            Enter Room
          </button>
        </form>
      </div>
    </div>
  );
};

