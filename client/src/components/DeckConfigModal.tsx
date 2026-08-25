import React, { useState } from 'react';
import { DeckConfig, DeckType, DEFAULT_DECKS } from '../types/room';

interface DeckConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDeck: DeckConfig;
  onSelectDeck: (deck: DeckConfig) => void;
}

export const DeckConfigModal: React.FC<DeckConfigModalProps> = ({
  isOpen,
  onClose,
  currentDeck,
  onSelectDeck,
}) => {
  const [selectedType, setSelectedType] = useState<DeckType>(currentDeck?.type || 'fibonacci');
  const [customInput, setCustomInput] = useState<string>(
    currentDeck?.type === 'custom' ? currentDeck.cards.join(', ') : '1, 2, 3, 5, 8, ?'
  );

  if (!isOpen) return null;

  const presets: { type: DeckType; label: string; description: string; sample: string }[] = [
    {
      type: 'fibonacci',
      label: 'Fibonacci',
      description: 'Standard agile scale for exponential effort growth',
      sample: DEFAULT_DECKS.fibonacci.join(', '),
    },
    {
      type: 'modified_fibonacci',
      label: 'Modified Fibonacci',
      description: 'Scrum standard with rounded high numbers',
      sample: DEFAULT_DECKS.modified_fibonacci.join(', '),
    },
    {
      type: 'tshirt',
      label: 'T-Shirt Sizes',
      description: 'Relative size estimation (XS to XXL)',
      sample: DEFAULT_DECKS.tshirt.join(', '),
    },
    {
      type: 'sequential',
      label: 'Sequential (1-10)',
      description: 'Linear progression for simpler grading',
      sample: DEFAULT_DECKS.sequential.join(', '),
    },
    {
      type: 'custom',
      label: 'Custom Scale',
      description: 'Define your own comma-separated values',
      sample: customInput,
    },
  ];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedType === 'custom') {
      const cards = customInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (cards.length > 0) {
        onSelectDeck({ type: 'custom', cards });
      }
    } else {
      onSelectDeck({ type: selectedType, cards: [...DEFAULT_DECKS[selectedType]] });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-base font-bold text-slate-900">Deck Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleApply} className="space-y-4">
          <div className="space-y-2.5">
            {presets.map((preset) => (
              <label
                key={preset.type}
                className={`block p-3 rounded-xl border cursor-pointer transition ${
                  selectedType === preset.type
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    name="deckType"
                    value={preset.type}
                    checked={selectedType === preset.type}
                    onChange={() => setSelectedType(preset.type)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="space-y-0.5 flex-1">
                    <div className="text-xs font-bold text-slate-900">{preset.label}</div>
                    <div className="text-[11px] text-slate-500">{preset.description}</div>
                    <div className="text-[10px] font-mono text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded mt-1 truncate">
                      {preset.sample}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {selectedType === 'custom' && (
            <div className="space-y-1 pt-1">
              <label className="text-xs font-bold text-slate-700">Custom Cards (comma-separated)</label>
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="1, 2, 3, 5, 8, ?"
                className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
            >
              Apply Deck Scale
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
