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
  { id: 'indigo', label: 'Indigo', bg: 'bg-[#2047a8]' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-600' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-600' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-600' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-600' },
  { id: 'violet', label: 'Violet', bg: 'bg-[#7f1d7a]' },
  { id: 'slate', label: 'Slate', bg: 'bg-[#2f4565]' },
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
    <div className="fixed inset-0 z-50 bg-[#10233f]/55 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-[#10233f]/12 rounded-2xl max-w-md w-full p-6 shadow-[0_30px_60px_rgba(12,28,55,0.25)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2047a8] to-[#7f1d7a] flex items-center justify-center text-xl font-bold text-white shadow-md shadow-[#2047a8]/20">
            🃏
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#10233f]">Join Poker Room</h2>
            <p className="text-xs text-[#5d6f88] font-medium">Zero-auth session • Reconnect anytime</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2047a8] mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex, Sarah, Devon"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-[#f9fbff] border border-[#10233f]/15 focus:border-[#2047a8] focus:ring-2 focus:ring-[#2047a8]/20 rounded-xl px-3.5 py-2 text-sm text-[#10233f] placeholder-[#5d6f88]/60 outline-none transition font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2047a8] mb-1.5">
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
                      ? 'ring-4 ring-[#2047a8]/40 scale-110 shadow-lg'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  {avatar === c.id && <span className="text-white text-xs font-black">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#2047a8] mb-1.5">
              Participation Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('Estimator')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-left flex flex-col ${
                  role === 'Estimator'
                    ? 'bg-[#2047a8]/10 border-[#2047a8] text-[#2047a8]'
                    : 'bg-[#f9fbff] border-[#10233f]/12 text-[#5d6f88] hover:border-[#10233f]/25'
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
                    ? 'bg-[#7f1d7a]/10 border-[#7f1d7a] text-[#7f1d7a]'
                    : 'bg-[#f9fbff] border-[#10233f]/12 text-[#5d6f88] hover:border-[#10233f]/25'
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
            className="w-full mt-2 py-2.5 rounded-full bg-gradient-to-r from-[#2047a8] to-[#16347d] hover:from-[#16347d] hover:to-[#10233f] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-[#2047a8]/25 transition active:scale-98"
          >
            Enter Room
          </button>
        </form>
      </div>
    </div>
  );
};
