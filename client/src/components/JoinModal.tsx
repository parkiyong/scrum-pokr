import React, { useState } from 'react';
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
  { id: 'indigo', label: 'Indigo', bg: 'bg-blue-600' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-600' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-600' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-600' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-600' },
  { id: 'violet', label: 'Violet', bg: 'bg-purple-600' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-600' },
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
  const prevOpenRef = React.useRef(isOpen);

  React.useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setNickname(initialNickname || '');
      setAvatar(initialAvatar || 'indigo');
      setRole(initialRole || 'Estimator');
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    onJoin(nickname.trim(), avatar, role);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-xl font-bold text-white shadow-xs">
            🃏
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Join Poker Room</h2>
            <p className="text-xs text-slate-500 font-normal">Zero-auth session • Reconnect anytime</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex, Sarah, Devon"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Avatar Color
            </label>
            <div className="flex items-center gap-2.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setAvatar(c.id)}
                  className={`w-8 h-8 rounded-full ${c.bg} transition-all duration-150 flex items-center justify-center ${
                    avatar === c.id
                      ? 'ring-3 ring-blue-500/40 scale-110 shadow-md'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {avatar === c.id && <span className="text-white text-xs font-black">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Participation Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('Estimator')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-left flex flex-col ${
                  role === 'Estimator'
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>Estimator</span>
                <span className="text-[10px] opacity-75 font-normal">Votes on story points</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('Observer')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-left flex flex-col ${
                  role === 'Observer'
                    ? 'bg-purple-50 border-purple-500 text-purple-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>Observer</span>
                <span className="text-[10px] opacity-75 font-normal">Watches without voting</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!nickname.trim()}
            className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-98"
          >
            Enter Room
          </button>
        </form>
      </div>
    </div>
  );
};

