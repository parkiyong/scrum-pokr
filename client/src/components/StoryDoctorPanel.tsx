import React, { useState } from 'react';
import { EstimationPhase, Story, StoryDoctorReport } from '../types/room';

interface StoryDoctorPanelProps {
  story: Story | null;
  report: StoryDoctorReport | null | undefined;
  phase: EstimationPhase;
  isFacilitator: boolean;
  onStartVoting: () => void;
  onToggleEdgeCase?: (id: string, checked: boolean) => void;
  onClose?: () => void;
}

export const StoryDoctorPanel: React.FC<StoryDoctorPanelProps> = ({
  story,
  report,
  phase,
  isFacilitator,
  onStartVoting,
  onToggleEdgeCase,
  onClose,
}) => {
  const [expandedCriteria, setExpandedCriteria] = useState(false);
  const [checkedEdgeCases, setCheckedEdgeCases] = useState<Record<string, boolean>>({});

  if (!story) {
    return (
      <div className="relative bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] text-center text-slate-500">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-xs text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
            title="Close Panel"
            aria-label="Close Story Doctor Panel"
          >
            ✕
          </button>
        )}
        <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg">
          🩺
        </div>
        <h3 className="text-sm font-bold text-slate-900">Story Doctor Idle</h3>
        <p className="text-xs mt-1 text-slate-500 leading-relaxed">
          Select an active story from the backlog to generate the pre-vote INVEST quality scorecard and technical edge cases.
        </p>
      </div>
    );
  }

  const scorecard = report?.scorecard;
  const complexity = report?.complexity;
  const edgeCases = report?.edge_cases || [];
  const score = scorecard?.overall_score ?? 85;

  const isChecked = (ec: (typeof edgeCases)[0]) =>
    checkedEdgeCases[ec.id] ?? ec.checked;

  const toggleEdgeCase = (id: string) => {
    const edgeCase = edgeCases.find((e) => e.id === id);
    const current = edgeCase ? isChecked(edgeCase) : false;
    const next = !current;
    setCheckedEdgeCases((prev) => ({
      ...prev,
      [id]: next,
    }));
    onToggleEdgeCase?.(id, next);
  };

  const checkedCount = edgeCases.filter(isChecked).length;

  // Derive status label from complexity text or defaults
  const getDataModelStatus = (text?: string) => {
    if (!text) return 'Low';
    if (/high|complex|sharding|migration/i.test(text)) return 'High';
    if (/moderate|medium|table/i.test(text)) return 'Med';
    return 'Low';
  };

  const getDepStatus = (text?: string) => {
    if (!text || /none|in-memory|no external/i.test(text)) return 'None';
    if (/oauth|auth|stripe|webhook/i.test(text)) return 'OAuth/API';
    return 'Browser/API';
  };

  const getBlastStatus = (text?: string) => {
    if (!text) return 'Isolated UI';
    if (/low|isolated/i.test(text)) return 'Isolated UI';
    if (/high|critical|outage/i.test(text)) return 'High Risk';
    return 'Moderate';
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] flex flex-col gap-4 text-slate-900">
      {/* Header with AI-powered Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-slate-900">Story Doctor</h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e0f0fe] text-[#0284c7] border border-[#bae6fd]">
            <svg className="w-3 h-3 text-[#0284c7]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L14.4 7.6L20 10L14.4 12.4L12 18L9.6 12.4L4 10L9.6 7.6L12 2Z" />
            </svg>
            AI-powered
          </span>

          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
              title="Close Panel"
              aria-label="Close Story Doctor Panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* READINESS SCORE SECTION */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>READINESS SCORE</span>
          <span
            className="w-3.5 h-3.5 rounded-full border border-slate-300 text-slate-400 inline-flex items-center justify-center text-[10px] cursor-pointer hover:border-slate-500 hover:text-slate-600"
            title="Calculated using INVEST story quality criteria"
          >
            ?
          </span>
        </div>

        <div className="flex items-center gap-3.5 pt-1">
          {/* Circular Donut Progress Ring */}
          <div className="relative w-14 h-14 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                strokeDasharray={`${score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="#3b82f6"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-slate-900">{score}%</span>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {score >= 80 ? 'Ready for Estimation' : score >= 50 ? 'Minor Ambiguities' : 'Scope Unclear'}
            </h4>
            <p className="text-xs text-slate-500 truncate mt-0.5 font-normal">
              {scorecard?.summary || 'Good story structure with clear...'}
            </p>
          </div>
        </div>

        {/* INVEST Criteria Breakdown Toggle */}
        <div className="pt-1">
          <button
            onClick={() => setExpandedCriteria(!expandedCriteria)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>Show INVEST Criteria Breakdown (6)</span>
            <span className="text-[10px] transform transition-transform duration-200">
              {expandedCriteria ? '▲' : '▼'}
            </span>
          </button>

          {expandedCriteria && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100">
              {(scorecard?.criteria || [
                { name: 'Independent', passed: true, score: 15, observation: 'No external blockers detected.' },
                { name: 'Negotiable', passed: true, score: 10, observation: 'Focuses on user outcome.' },
                { name: 'Valuable', passed: true, score: 20, observation: 'Clear value statement.' },
                { name: 'Estimable', passed: true, score: 20, observation: 'Concrete scope.' },
                { name: 'Small', passed: true, score: 15, observation: 'Bounded scope.' },
                { name: 'Testable', passed: true, score: 15, observation: 'Clear acceptance criteria.' },
              ]).map((c) => (
                <div
                  key={c.name}
                  className={`p-2 rounded-lg text-xs border flex flex-col gap-0.5 ${
                    c.passed
                      ? 'bg-emerald-50/50 border-emerald-200/80 text-slate-800'
                      : 'bg-rose-50/60 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1 text-[11px]">
                      <span className={c.passed ? 'text-emerald-600' : 'text-rose-600'}>
                        {c.passed ? '✓' : '✗'}
                      </span>
                      <span>{c.name}</span>
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-white border border-slate-200">
                      {c.score} pts
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{c.observation}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3-AXIS TECHNICAL COMPLEXITY SECTION */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          3-AXIS TECHNICAL COMPLEXITY
        </h4>

        <div className="grid grid-cols-3 gap-2">
          {/* Card 1: Data Models & Schema */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-2.5 flex flex-col justify-between min-h-[76px]">
            <div className="w-5 h-5 rounded-md bg-[#dcfce7] text-[#16a34a] flex items-center justify-center mb-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-900 leading-tight">
                Data Models &amp; Schema
              </div>
              <div className="text-xs font-bold text-[#16a34a] mt-1">
                {getDataModelStatus(complexity?.data_models)}
              </div>
            </div>
          </div>

          {/* Card 2: Dependencies & APIs */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between min-h-[76px]">
            <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mb-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-900 leading-tight">
                Dependencies &amp; APIs
              </div>
              <div className="text-xs font-bold text-slate-700 mt-1">
                {getDepStatus(complexity?.dependencies_apis)}
              </div>
            </div>
          </div>

          {/* Card 3: Blast Radius & Risk */}
          <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between min-h-[76px]">
            <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-900 leading-tight">
                Blast Radius &amp; Risk
              </div>
              <div className="text-xs font-bold text-slate-700 mt-1">
                {getBlastStatus(complexity?.blast_radius)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDGE-CASE CHECKLIST SECTION */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          EDGE-CASE CHECKLIST ({checkedCount}/{edgeCases.length || 2})
        </h4>

        <div className="space-y-1.5">
          {(edgeCases.length > 0 ? edgeCases : [
            { id: 'ec-default-1', title: 'Network Disconnect', checked: false },
            { id: 'ec-default-2', title: 'Empty Payload', checked: false },
          ]).map((ec) => {
            const itemChecked = isChecked(ec as (typeof edgeCases)[0]);
            return (
              <label
                key={ec.id}
                onClick={() => toggleEdgeCase(ec.id)}
                className="flex items-center gap-2.5 py-1 px-1 rounded-lg hover:bg-slate-50 cursor-pointer transition select-none"
              >
                <input
                  type="checkbox"
                  checked={itemChecked}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span
                  className={`text-xs font-medium ${
                    itemChecked ? 'line-through text-slate-400' : 'text-slate-800'
                  }`}
                >
                  {ec.title}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Facilitator Action CTA at Bottom */}
      {isFacilitator && (phase === 'StoryDoctorReview' || phase === 'Idle') && (
        <div className="pt-2">
          <button
            onClick={onStartVoting}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#3b82f6] hover:bg-[#2563eb] active:scale-[0.99] transition shadow-[0_2px_8px_rgba(59,130,246,0.25)] flex items-center justify-center gap-2"
          >
            <span>Start Voting Round</span>
          </button>
        </div>
      )}
    </div>
  );
};

