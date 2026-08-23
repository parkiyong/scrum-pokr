import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Layers, Zap } from 'lucide-react';
import { BacklogDrawer } from '../components/BacklogDrawer';
import { ConnectTrackerModal } from '../components/ConnectTrackerModal';
import { DeckSelector } from '../components/DeckSelector';
import { FacilitatorBar } from '../components/FacilitatorBar';
import { Header } from '../components/Header';
import { JoinModal } from '../components/JoinModal';
import { PointReferenceLibrary } from '../components/PointReferenceLibrary';
import { PokerTableArena } from '../components/PokerTableArena';
import { SPIDRSliceModal } from '../components/SPIDRSliceModal';
import { StoryDoctorPanel } from '../components/StoryDoctorPanel';
import { useRoomSocket } from '../hooks/useRoomSocket';
import { Role } from '../types/room';

interface RoomViewProps {
  slug: string;
  onLeave: () => void;
}

export const RoomView: React.FC<RoomViewProps> = ({ slug, onLeave: _onLeave }) => {
  const {
    roomState,
    status,
    currentParticipantId,
    myProfile,
    isFacilitator,
    connectionPreview,
    trackerError,
    syncFeedback,
    joinRoom,
    startVoting,
    castVote,
    retractVote,
    revealCards,
    triggerReVote,
    finalizeStory,
    selectStoryById,
    updatePointReferences,
    toggleEdgeCaseCheck,
    connectTracker,
    disconnectTracker,
    testTrackerConnection,
    fetchBacklog,
    importBacklog,
    importMarkdown,
    syncEstimateToTracker,
    pushStorySlices,
    reorderBacklog,
    removeStoryFromBacklog,
    clearTrackerFeedback,
  } = useRoomSocket(slug);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(!myProfile);
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  const [isTrackerModalOpen, setIsTrackerModalOpen] = useState(false);
  const [isSliceModalOpen, setIsSliceModalOpen] = useState(false);
  const [isDoctorDrawerOpen, setIsDoctorDrawerOpen] = useState(false);
  const [isRefLibraryDrawerOpen, setIsRefLibraryDrawerOpen] = useState(false);
  const [showAcList, setShowAcList] = useState(false);

  const myParticipant = roomState?.participants.find((p) => p.id === currentParticipantId);
  const myVote = myParticipant?.vote;

  const handleCardClick = (val: string) => {
    if (myVote === val) {
      retractVote();
    } else {
      castVote(val);
    }
  };

  const handleJoinModalSubmit = (nickname: string, avatar: string, role: Role) => {
    joinRoom(nickname, avatar, role);
    setIsJoinModalOpen(false);
  };

  if (!roomState && status === 'connecting') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 text-slate-900 selection:bg-blue-600 selection:text-white">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-3xl text-blue-600 shadow-glow animate-pulse">
          🃏
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold font-display text-slate-900">Connecting to Room</h2>
          <p className="text-xs font-mono text-blue-600 font-semibold uppercase tracking-wider">{slug}</p>
        </div>
      </div>
    );
  }

  const phase = roomState?.phase || 'Idle';
  const roundNumber = roomState?.round_number || 1;
  const participants = roomState?.participants || [];
  const consensus = roomState?.consensus;
  const activeStory = roomState?.active_story;
  const storyDoctorReport = roomState?.story_doctor_report;
  const pointReferences = roomState?.point_references || [];
  const backlog = roomState?.backlog || [];
  const activeTrackerProvider = roomState?.active_tracker_provider;
  const trackerConnected = roomState?.tracker_connected || false;

  const handleSyncActiveEstimate = () => {
    if (!activeStory) return;
    const suggested = consensus?.suggested_points || '5';
    const numericPoints = parseInt(suggested, 10) || 5;
    syncEstimateToTracker(activeStory.id, numericPoints, true);
  };

  const renderDesktopStoryDoctor = () => (
    <StoryDoctorPanel
      story={activeStory || null}
      report={storyDoctorReport}
      phase={phase}
      isFacilitator={isFacilitator}
      onStartVoting={startVoting}
      onToggleEdgeCase={toggleEdgeCaseCheck}
    />
  );

  const renderMobileStoryDoctor = () => (
    <StoryDoctorPanel
      story={activeStory || null}
      report={storyDoctorReport}
      phase={phase}
      isFacilitator={isFacilitator}
      onStartVoting={() => {
        startVoting();
        setIsDoctorDrawerOpen(false);
      }}
      onToggleEdgeCase={toggleEdgeCaseCheck}
      onClose={() => setIsDoctorDrawerOpen(false)}
    />
  );

  const renderDesktopPointReferenceLibrary = () => (
    <PointReferenceLibrary
      references={pointReferences}
      isFacilitator={isFacilitator}
      onUpdateReferences={updatePointReferences}
    />
  );

  const renderMobilePointReferenceLibrary = () => (
    <div className="relative">
      <button
        onClick={() => setIsRefLibraryDrawerOpen(false)}
        className="absolute top-4 right-4 text-[#5d6f88] hover:text-[#10233f] z-10 text-sm font-bold"
      >
        ✕
      </button>
      <PointReferenceLibrary
        references={pointReferences}
        isFacilitator={isFacilitator}
        onUpdateReferences={updatePointReferences}
      />
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-transparent text-slate-900 pb-32">
      {/* Header */}
      <Header
        slug={roomState?.slug || slug}
        shortCode={roomState?.short_code || '---'}
        myParticipant={myParticipant}
        isFacilitator={isFacilitator}
        status={status}
        onChangeProfile={() => setIsJoinModalOpen(true)}
      />

      {/* Main Room Arena Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex flex-col">
        {/* Active Story Spotlight Card */}
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-4 sm:p-5 mb-3 flex flex-col gap-3 shadow-soft transition-all">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-0.5 rounded-full shadow-xs">
                  Active Story
                </span>

                {activeStory?.key && (
                  <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md">
                    {activeStory.key}
                  </span>
                )}

                {activeStory?.url && (
                  <a
                    href={activeStory.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 transition group"
                  >
                    <span>View in {activeStory.tracker_provider || 'Tracker'}</span>
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold font-display text-slate-900 leading-snug">
                {activeStory?.title || 'General Estimation Round'}
              </h2>

              {activeStory?.description && (
                <p className="text-xs text-slate-600 line-clamp-2 font-normal leading-relaxed">
                  {activeStory.description}
                </p>
              )}

              {activeStory?.acceptance_criteria && activeStory.acceptance_criteria.length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => setShowAcList(!showAcList)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1"
                  >
                    <span>{showAcList ? 'Hide' : 'Show'} Acceptance Criteria ({activeStory.acceptance_criteria.length})</span>
                    {showAcList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {showAcList && (
                    <ul className="mt-2.5 space-y-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 font-medium animate-fade-in">
                      {activeStory.acceptance_criteria.map((ac, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="leading-relaxed">{ac}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Top Quick Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center flex-wrap flex-shrink-0">
              {/* Mobile / Tablet Quick Toggles */}
              <button
                onClick={() => setIsDoctorDrawerOpen(true)}
                className="lg:hidden px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-blue-700 border border-blue-200/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <span>🩺</span>
                <span>Story Doctor</span>
              </button>

              <button
                onClick={() => setIsRefLibraryDrawerOpen(true)}
                className="lg:hidden px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <span>📚</span>
                <span>References</span>
              </button>

              <button
                onClick={() => setIsBacklogOpen(true)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95"
              >
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <span>Backlog ({backlog.length})</span>
              </button>

              {isFacilitator && (
                <button
                  onClick={() => setIsTrackerModalOpen(true)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs active:scale-95 ${
                    trackerConnected
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-500/20'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{activeTrackerProvider ? `${activeTrackerProvider} Connected` : 'Connect Tracker'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Facilitator Controls Bar */}
        <FacilitatorBar
          phase={phase}
          activeStory={activeStory}
          hasTracker={trackerConnected}
          onStartVoting={startVoting}
          onRevealCards={revealCards}
          onTriggerReVote={triggerReVote}
          onFinalize={() => finalizeStory()}
          onSyncEstimate={handleSyncActiveEstimate}
          onDecomposeSlices={() => setIsSliceModalOpen(true)}
          isFacilitator={isFacilitator}
          syncFeedback={syncFeedback}
        />

        {/* 3-Column Responsive Command Center Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left Column (Desktop): Story Doctor Quality Gate */}
          <div className="hidden lg:block lg:col-span-4 space-y-4">
            {renderDesktopStoryDoctor()}
          </div>

          {/* Center Column: Poker Table Arena */}
          <div className="col-span-1 lg:col-span-5 flex flex-col items-center justify-center min-h-[420px]">
            <PokerTableArena
              participants={participants}
              currentUserId={currentParticipantId}
              facilitatorId={roomState?.facilitator_id}
              phase={phase}
              roundNumber={roundNumber}
              consensus={consensus}
            />
          </div>

          {/* Right Column: Point Reference Library */}
          <div className="hidden lg:block lg:col-span-3 space-y-4">
            {renderDesktopPointReferenceLibrary()}
          </div>
        </div>
      </main>

      {/* Mobile/Tablet Story Doctor Drawer/Modal */}
      {isDoctorDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1220]/60 backdrop-blur-sm lg:hidden animate-fade-in">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {renderMobileStoryDoctor()}
          </div>
        </div>
      )}

      {/* Mobile/Tablet Point Reference Library Modal */}
      {isRefLibraryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1220]/60 backdrop-blur-sm lg:hidden animate-fade-in">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto">
            {renderMobilePointReferenceLibrary()}
          </div>
        </div>
      )}

      {/* Bottom Fibonacci Card Deck Dock */}
      {myParticipant?.role !== 'Observer' && (
        <DeckSelector
          selectedCard={myVote}
          onSelectCard={handleCardClick}
          disabled={phase !== 'Voting' && phase !== 'Revealed'}
        />
      )}

      {/* Backlog Drawer */}
      <BacklogDrawer
        isOpen={isBacklogOpen}
        onClose={() => setIsBacklogOpen(false)}
        backlog={backlog}
        activeStoryId={activeStory?.id}
        isFacilitator={isFacilitator}
        activeTrackerProvider={activeTrackerProvider}
        onSelectStory={(id) => {
          selectStoryById(id);
          setIsBacklogOpen(false);
        }}
        onReorder={reorderBacklog}
        onRemove={removeStoryFromBacklog}
        onOpenConnectModal={() => {
          setIsBacklogOpen(false);
          setIsTrackerModalOpen(true);
        }}
      />

      {/* Connect Issue Tracker & Import Modal */}
      <ConnectTrackerModal
        isOpen={isTrackerModalOpen}
        slug={slug}
        isFacilitator={isFacilitator}
        activeProvider={activeTrackerProvider}
        connectionPreview={connectionPreview}
        trackerError={trackerError}
        onConnect={connectTracker}
        onDisconnect={disconnectTracker}
        onTestConnection={testTrackerConnection}
        onFetchBacklog={fetchBacklog}
        onImportMarkdown={importMarkdown}
        onImportBacklog={importBacklog}
        onClose={() => setIsTrackerModalOpen(false)}
        onClearFeedback={clearTrackerFeedback}
      />

      {/* SPIDR Vertical Slice Modal */}
      <SPIDRSliceModal
        isOpen={isSliceModalOpen}
        onClose={() => setIsSliceModalOpen(false)}
        activeStory={activeStory || null}
        onPushSlices={pushStorySlices}
      />

      <JoinModal
        isOpen={isJoinModalOpen}
        initialNickname={myProfile?.nickname}
        initialAvatar={myProfile?.avatar}
        initialRole={myProfile?.role}
        onJoin={handleJoinModalSubmit}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
};


