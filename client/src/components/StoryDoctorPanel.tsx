import React, { useState } from 'react';
import { EstimationPhase, Story, StoryDoctorReport } from '../types/room';

interface StoryDoctorPanelProps {
  story: Story | null;
  report: StoryDoctorReport | null | undefined;
  phase: EstimationPhase;
  isFacilitator: boolean;
  onStartVoting: () => void;
  onClose?: () => void;
}

export const StoryDoctorPanel: React.FC<StoryDoctorPanelProps> = ({
  story,
  report,
  phase,
  isFacilitator,
  onStartVoting,
  onClose,
}) => {
  const [expandedCriteria, setExpandedCriteria] = useState(false);
  const [checkedEdgeCases, setCheckedEdgeCases] = useState<Record<string, boolean>>({});

  if (!story) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/12 rounded-2xl p-5 shadow-[0_10px_30px_rgba(18,42,82,0.06)] text-center text-[#5d6f88]">
        <div className="text-3xl mb-2">🩺</div>
        <h3 className="text-sm font-bold text-[#10233f]">Story Doctor Idle</h3>
        <p className="text-xs mt-1">Select an active story from the backlog to generate the pre-vote INVEST quality scorecard and technical edge cases.</p>
      </div>
    );
  }

  const scorecard = report?.scorecard;
  const complexity = report?.complexity;
  const edgeCases = report?.edge_cases || [];
  const score = scorecard?.overall_score ?? 0;

  const getScoreColor = (val: number) => {
    if (val >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (val >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  const getScoreGaugeColor = (val: number) => {
    if (val >= 80) return '#059669';
    if (val >= 50) return '#d97706';
    return '#e11d48';
  };

  const toggleEdgeCase = (id: string) => {
    setCheckedEdgeCases((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const checkedCount = edgeCases.filter((ec) => checkedEdgeCases[ec.id]).length;

  return (
    <div className="bg-white/95 backdrop-blur-md border border-[#10233f]/12 rounded-2xl p-5 shadow-[0_14px_34px_rgba(18,42,82,0.08)] flex flex-col gap-4 text-[#10233f]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#10233f]/10 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🩺</span>
          <div>
            <h3 className="text-sm font-bold text-[#10233f] flex items-center gap-2">
              Story Doctor
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#2047a8]/10 text-[#2047a8] border border-[#2047a8]/20">
                Pre-Vote Gate
              </span>
            </h3>
            <p className="text-[11px] text-[#5d6f88]">INVEST Quality Audit & Technical Edge Cases</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-[#5d6f88] hover:text-[#10233f] p-1 rounded-md hover:bg-[#edf3fb]"
            title="Close Panel"
          >
            ✕
          </button>
        )}
      </div>

      {/* INVEST Readiness Gauge & Scorecard */}
      <div className="bg-gradient-to-br from-[#f8faff] to-[#edf3fb] border border-[#10233f]/10 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* SVG Circular Progress Gauge */}
            <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  strokeDasharray={`${score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke={getScoreGaugeColor(score)}
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-xs font-black text-[#10233f]">{score}%</span>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#5d6f88]">
                Readiness Score
              </span>
              <div className="text-xs font-bold text-[#10233f]">
                {score >= 80 ? '✓ Ready for Estimation' : score >= 50 ? '⚠ Minor Ambiguities' : '⚠ Scope Unclear'}
              </div>
              <p className="text-[11px] text-[#5d6f88] line-clamp-1">
                {scorecard?.summary || 'Auditing story quality against INVEST standards...'}
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${getScoreColor(score)}`}
          >
            {score >= 80 ? 'INVEST High' : score >= 50 ? 'INVEST Med' : 'INVEST Low'}
          </span>
        </div>

        {/* Non-blocking Advisory Warning Banner */}
        {score < 80 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-amber-900 font-medium">
              <span>⚠</span>
              <span>
                {scorecard?.issues.length
                  ? scorecard.issues[0]
                  : 'Consider clarifying acceptance criteria before voting opens.'}
              </span>
            </div>

            {isFacilitator && (phase === 'StoryDoctorReview' || phase === 'Idle') && (
              <button
                onClick={onStartVoting}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold whitespace-nowrap transition shadow-sm"
              >
                Vote Anyway →
              </button>
            )}
          </div>
        )}

        {/* Criteria Breakdown Toggle */}
        {scorecard?.criteria && (
          <div>
            <button
              onClick={() => setExpandedCriteria(!expandedCriteria)}
              className="text-[11px] font-bold text-[#2047a8] hover:text-[#16347d] transition flex items-center gap-1"
            >
              <span>{expandedCriteria ? '▼ Hide' : '▶ Show'} INVEST Criteria Breakdown (6)</span>
            </button>

            {expandedCriteria && (
              <div className="mt-2 space-y-1.5 pt-2 border-t border-[#10233f]/10">
                {scorecard.criteria.map((c) => (
                  <div
                    key={c.name}
                    className={`p-2 rounded-lg text-xs border flex flex-col gap-1 ${
                      c.passed
                        ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                        : 'bg-rose-50/70 border-rose-200 text-rose-950'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1">
                        <span>{c.passed ? '✓' : '✗'}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white/80">
                        {c.score} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5d6f88]">{c.observation}</p>
                    {c.recommendation && (
                      <p className="text-[10px] text-rose-700 font-medium italic">
                        💡 Recommendation: {c.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3-Axis Technical Complexity Summary */}
      {complexity && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#5d6f88] flex items-center gap-1.5">
            <span>⚙️</span> 3-Axis Technical Complexity
          </h4>

          <div className="grid grid-cols-1 gap-2 text-xs">
            {/* Data Models */}
            <div className="bg-[#f9fbff] border border-[#10233f]/10 rounded-xl p-3 flex flex-col gap-1">
              <div className="font-bold text-[#10233f] flex items-center gap-1.5 text-xs">
                <span>💾</span>
                <span>Data Models & Schema</span>
              </div>
              <p className="text-[11px] text-[#5d6f88] font-medium leading-relaxed">
                {complexity.data_models}
              </p>
            </div>

            {/* Dependencies & APIs */}
            <div className="bg-[#f9fbff] border border-[#10233f]/10 rounded-xl p-3 flex flex-col gap-1">
              <div className="font-bold text-[#10233f] flex items-center gap-1.5 text-xs">
                <span>🔌</span>
                <span>Dependencies & APIs</span>
              </div>
              <p className="text-[11px] text-[#5d6f88] font-medium leading-relaxed">
                {complexity.dependencies_apis}
              </p>
            </div>

            {/* Blast Radius */}
            <div className="bg-[#f9fbff] border border-[#10233f]/10 rounded-xl p-3 flex flex-col gap-1">
              <div className="font-bold text-[#10233f] flex items-center gap-1.5 text-xs">
                <span>💥</span>
                <span>Blast Radius & Risk</span>
              </div>
              <p className="text-[11px] text-[#5d6f88] font-medium leading-relaxed">
                {complexity.blast_radius}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4-Category Edge-Case Generator & Checklist */}
      {edgeCases.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5d6f88] flex items-center gap-1.5">
              <span>🎯</span> Edge-Case Checklist ({checkedCount}/{edgeCases.length})
            </h4>
            <span className="text-[10px] text-[#5d6f88]">Click to verify</span>
          </div>

          <div className="space-y-2">
            {edgeCases.map((ec) => {
              const isChecked = !!checkedEdgeCases[ec.id];
              return (
                <div
                  key={ec.id}
                  onClick={() => toggleEdgeCase(ec.id)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                    isChecked
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
                      : 'bg-[#f9fbff] hover:bg-[#edf3fb] border-[#10233f]/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Handled by parent container click
                    className="mt-0.5 rounded text-[#2047a8] focus:ring-[#2047a8] cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-xs font-bold truncate ${
                          isChecked ? 'line-through text-emerald-800' : 'text-[#10233f]'
                        }`}
                      >
                        {ec.title}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 whitespace-nowrap">
                        {ec.category_name}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5d6f88] mt-0.5 leading-tight">{ec.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary Action Button (Facilitator) */}
      {isFacilitator && (phase === 'StoryDoctorReview' || phase === 'Idle') && (
        <div className="pt-2 border-t border-[#10233f]/10">
          <button
            onClick={onStartVoting}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#2047a8] to-[#16347d] hover:opacity-95 transition shadow-[0_4px_16px_rgba(32,71,168,0.25)] flex items-center justify-center gap-2"
          >
            <span>🃏</span>
            <span>Start Voting Round →</span>
          </button>
        </div>
      )}
    </div>
  );
};
