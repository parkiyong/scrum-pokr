import React from 'react';
import { Layers } from 'lucide-react';

interface DeckSelectorProps {
  selectedCard?: string;
  onSelectCard: (val: string) => void;
  disabled?: boolean;
}

const FIBONACCI_DECK = ['0', '0.5', '1', '2', '3', '5', '8', '13', '21', '?'];

export const DeckSelector: React.FC<DeckSelectorProps> = ({
  selectedCard,
  onSelectCard,
  disabled = false,
}) => {
  return (
    <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 max-w-[96vw] sm:max-w-fit">
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-2xl sm:rounded-3xl px-3 sm:px-5 pt-3 sm:pt-4 pb-2.5 sm:pb-3 shadow-modal flex items-center gap-2.5 max-w-full overflow-x-auto overflow-y-hidden no-scrollbar">
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500 px-1 select-none whitespace-nowrap">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Estimate:</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 pt-1 pb-0.5">
          {FIBONACCI_DECK.map((val) => {
            const isSelected = selectedCard === val;
            return (
              <button
                key={val}
                disabled={disabled}
                onClick={() => onSelectCard(val)}
                aria-pressed={isSelected}
                className={`w-10 h-14 sm:w-12 sm:h-16 rounded-xl sm:rounded-2xl font-display font-black text-base sm:text-lg tabular-nums flex items-center justify-center transition-all duration-200 select-none flex-shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-b from-blue-600 to-indigo-800 text-white -translate-y-2.5 sm:-translate-y-3 shadow-glow ring-2 ring-blue-500 scale-105'
                    : 'bg-gradient-to-b from-white to-slate-50 text-slate-800 border border-slate-200/90 shadow-soft hover:bg-slate-100 hover:border-blue-300 hover:-translate-y-1.5'
                } ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed hover:translate-y-0'
                    : 'cursor-pointer active:scale-95'
                }`}
              >
                <span>{val}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

