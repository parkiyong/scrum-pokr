import React, { useState } from 'react';
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

export const RoomView: React.FC<RoomViewProps> = ({ slug, onLeave }) => {
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
    nextStory,
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-2xl font-bold text-blue-600 animate-pulse shadow-sm">
          🃏
        </div>
        <p className="text-sm font-semibold text-slate-600">Connecting to room {slug}...</p>
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

  return (
    <div className="min-h-screen flex flex-col bg-[#dce8f5] text-slate-900 pb-12">
      {/* Top Header */}
      <Header
        slug={roomState?.slug || slug}
        shortCode={roomState?.short_code || '---'}
        myParticipant={myParticipant}
        isFacilitator={isFacilitator}
        status={status}
        onChangeProfile={() => setIsJoinModalOpen(true)}
      />

      {/* Main Content Arena */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 flex flex-col">
        {/* Active Story Banner */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-2 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Story Info Left */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button
                onClick={onLeave}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition flex-shrink-0 mt-0.5"
                title="Leave room"
                aria-label="Back to Lobby"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#dceefc] text-[#0284c7] border border-[#bae6fd] px-2.5 py-0.5 rounded-md">
                    ACTIVE STORY
                  </span>

                  {activeStory?.key && (
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.2 rounded-md">
                      {activeStory.key}
                    </span>
                  )}

                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {activeStory?.title || 'Sample User Story'}
                  </h2>
                </div>

                <p className="text-xs text-slate-500 font-normal leading-relaxed">
                  {activeStory?.description ||
                    'As a user, I want to estimate user stories collaboratively so that our team aligns on effort.'}
                </p>
              </div>
            </div>

            {/* Story Banner Right Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
              {/* Mobile Quick Toggles */}
              <button
                onClick={() => setIsDoctorDrawerOpen(true)}
                className="lg:hidden px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
              >
                🩺 Story Doctor
              </button>

              <button
                onClick={() => setIsRefLibraryDrawerOpen(true)}
                className="lg:hidden px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
              >
                📚 References
              </button>

              <button
                onClick={() => setIsBacklogOpen(true)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                Backlog ({backlog.length})
              </button>

              {isFacilitator && (
                <button
                  onClick={() => setIsTrackerModalOpen(true)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 ${
                    trackerConnected
                      ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                      : 'bg-[#3b82f6] hover:bg-[#2563eb] text-white'
                  }`}
                >
                  {activeTrackerProvider ? `${activeTrackerProvider} Connected` : 'Connect Tracker'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Facilitator Controls Row */}
        <FacilitatorBar
          phase={phase}
          activeStory={activeStory}
          hasTracker={trackerConnected}
          onStartVoting={startVoting}
          onRevealCards={revealCards}
          onTriggerReVote={triggerReVote}
          onFinalize={() => finalizeStory()}
          onNextStory={nextStory}
          onSyncEstimate={handleSyncActiveEstimate}
          onDecomposeSlices={() => setIsSliceModalOpen(true)}
          isFacilitator={isFacilitator}
          syncFeedback={syncFeedback}
        />

        {/* 3-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start mt-1">
          {/* Left Column: Story Doctor Quality Gate */}
          <div className="hidden lg:block lg:col-span-4">
            <StoryDoctorPanel
              story={activeStory || { id: 'sample-1', title: 'Sample User Story', description: 'As a user, I want to estimate user stories collaboratively so that our team aligns on effort.', acceptance_criteria: ['Collaborative estimation', 'Consensus detection'] }}
              report={storyDoctorReport}
              phase={phase}
              isFacilitator={isFacilitator}
              onStartVoting={startVoting}
              onToggleEdgeCase={toggleEdgeCaseCheck}
            />
          </div>

          {/* Center Column: Virtual Poker Table + Docked Card Deck */}
          <div className="col-span-1 lg:col-span-5 flex flex-col items-center justify-between">
            <PokerTableArena
              participants={participants.length > 0 ? participants : [
                {
                  id: currentParticipantId,
                  nickname: myProfile?.nickname || 'Jaka',
                  avatar: myProfile?.avatar || 'indigo',
                  role: myProfile?.role || 'Estimator',
                  connected: true,
                  voted: false,
                },
              ]}
              currentUserId={currentParticipantId}
              facilitatorId={roomState?.facilitator_id || currentParticipantId}
              phase={phase}
              roundNumber={roundNumber}
              consensus={consensus}
            />

            {/* Pick Card Bar docked directly under poker table */}
            {myParticipant?.role !== 'Observer' && (
              <DeckSelector
                selectedCard={myVote}
                onSelectCard={handleCardClick}
                disabled={phase !== 'Voting'}
              />
            )}
          </div>

          {/* Right Column: Point Reference Library */}
          <div className="hidden lg:block lg:col-span-3">
            <PointReferenceLibrary
              references={pointReferences}
              isFacilitator={isFacilitator}
              onUpdateReferences={updatePointReferences}
            />
          </div>
        </div>
      </main>

      {/* Mobile Story Doctor Modal */}
      {isDoctorDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in">
          <div className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <StoryDoctorPanel
              story={activeStory || { id: 'sample-1', title: 'Sample User Story', description: 'As a user, I want to estimate user stories collaboratively.', acceptance_criteria: ['Collaborative estimation'] }}
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
          </div>
        </div>
      )}

      {/* Mobile Point Reference Library Modal */}
      {isRefLibraryDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in">
          <div className="max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <button
                onClick={() => setIsRefLibraryDrawerOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 z-10 text-sm font-bold p-1"
              >
                ✕
              </button>
              <PointReferenceLibrary
                references={pointReferences}
                isFacilitator={isFacilitator}
                onUpdateReferences={updatePointReferences}
              />
            </div>
          </div>
        </div>
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

      {/* Onboarding / Profile Join Modal */}
      <JoinModal
        isOpen={isJoinModalOpen}
        initialNickname={myProfile?.nickname}
        initialAvatar={myProfile?.avatar}
        initialRole={myParticipant?.role || myProfile?.role}
        onJoin={handleJoinModalSubmit}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
};


