import React from 'react';

interface DeckSelectorProps {
  selectedCard?: string;
  onSelectCard: (val: string) => void;
  disabled?: boolean;
}

const FIBONACCI_DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '?'];

export const DeckSelector: React.FC<DeckSelectorProps> = ({
  selectedCard,
  onSelectCard,
  disabled = false,
}) => {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[95vw] sm:max-w-fit">
      <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/15 rounded-2xl px-4 pt-4 pb-3 shadow-[0_24px_60px_rgba(18,42,82,0.15)] flex items-center gap-2 max-w-full overflow-x-auto overflow-y-hidden no-scrollbar">
        <span className="text-xs font-bold text-[#2047a8] uppercase tracking-wider px-2 hidden md:inline select-none whitespace-nowrap">
          Pick Card:
        </span>
        <div className="flex items-center gap-2 pt-1 pb-0.5">
          {FIBONACCI_DECK.map((val) => {
            const isSelected = selectedCard === val;
            return (
              <button
                key={val}
                disabled={disabled}
                onClick={() => onSelectCard(val)}
                className={`w-11 h-14 sm:w-13 sm:h-16 rounded-xl font-black text-lg sm:text-xl flex items-center justify-center transition-all duration-200 select-none shadow-md flex-shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#2047a8] to-[#16347d] text-white -translate-y-2 shadow-lg shadow-[#2047a8]/40 ring-2 ring-[#2047a8]'
                    : 'bg-gradient-to-b from-[#ffffff] to-[#f2f7ff] text-[#10233f] border border-[#2047a8]/20 hover:bg-[#edf3fb] hover:border-[#2047a8]/40 hover:-translate-y-1'
                } ${disabled ? 'opacity-50 cursor-not-allowed hover:translate-y-0' : 'cursor-pointer active:scale-95'}`}
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
