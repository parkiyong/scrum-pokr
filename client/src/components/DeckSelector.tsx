import React from 'react';
import { DeckConfig, DEFAULT_DECKS } from '../types/room';

interface DeckSelectorProps {
  deck?: DeckConfig;
  selectedCard?: string | null;
  onSelectCard: (val: string) => void;
  disabled?: boolean;
}

export const DeckSelector: React.FC<DeckSelectorProps> = ({
  deck,
  selectedCard,
  onSelectCard,
  disabled = false,
}) => {
  const cards = deck?.cards || DEFAULT_DECKS.fibonacci;

  return (
    <div className="w-full mt-3 flex flex-col items-center">
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 max-w-full">
        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider select-none mr-1">
          PICK CARD:
        </span>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center">
          {cards.map((val) => {
            const isSelected = selectedCard === val;
            return (
              <button
                key={val}
                disabled={disabled}
                onClick={() => onSelectCard(val)}
                className={`w-10 h-13 sm:w-11 sm:h-15 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center transition-all duration-150 select-none shadow-sm flex-shrink-0 ${
                  isSelected
                    ? 'bg-[#3b82f6] text-white -translate-y-1 shadow-md shadow-blue-500/30 ring-2 ring-blue-400'
                    : 'bg-[#dceefc] hover:bg-[#cee6fc] text-slate-900 border border-[#badaf8] hover:-translate-y-0.5'
                } ${disabled ? 'opacity-40 cursor-not-allowed hover:translate-y-0' : 'cursor-pointer active:scale-95'}`}
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
