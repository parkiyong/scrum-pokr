import React, { useState } from 'react';
import { BacklogDrawer } from '../components/BacklogDrawer';
import { ConnectTrackerModal } from '../components/ConnectTrackerModal';
import { DeckSelector } from '../components/DeckSelector';
import { FacilitatorBar } from '../components/FacilitatorBar';
import { Header } from '../components/Header';
import { JoinModal } from '../components/JoinModal';
import { PokerTableArena } from '../components/PokerTableArena';
import { SPIDRSliceModal } from '../components/SPIDRSliceModal';
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-2xl font-bold animate-pulse">
          🃏
        </div>
        <p className="text-sm font-medium text-slate-400">Connecting to room {slug}...</p>
      </div>
    );
  }

  const phase = roomState?.phase || 'Idle';
  const roundNumber = roomState?.round_number || 1;
  const participants = roomState?.participants || [];
  const consensus = roomState?.consensus;
  const activeStory = roomState?.active_story;
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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-28">
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
        {/* Story Info Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col gap-3 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  Active Story
                </span>

                {activeStory?.key && (
                  <span className="text-[11px] font-mono font-bold bg-slate-800 text-indigo-300 border border-slate-700 px-2 py-0.5 rounded-md">
                    {activeStory.key}
                  </span>
                )}

                {activeStory?.url && (
                  <a
                    href={activeStory.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-slate-400 hover:text-indigo-300 underline flex items-center gap-1 transition"
                  >
                    View in {activeStory.tracker_provider || 'Tracker'} ↗
                  </a>
                )}

                <h2 className="text-sm sm:text-base font-bold text-white">
                  {activeStory?.title || 'General Estimation Round'}
                </h2>
              </div>

              {activeStory?.description && (
                <p className="text-xs text-slate-400 line-clamp-2">
                  {activeStory.description}
                </p>
              )}

              {activeStory?.acceptance_criteria && activeStory.acceptance_criteria.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowAcList(!showAcList)}
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
                  >
                    <span>{showAcList ? '▼ Hide' : '▶ Show'} Acceptance Criteria ({activeStory.acceptance_criteria.length})</span>
                  </button>

                  {showAcList && (
                    <ul className="mt-2 space-y-1 bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
                      {activeStory.acceptance_criteria.map((ac, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-400 font-bold">•</span>
                          <span>{ac}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Top Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
              <button
                onClick={() => setIsBacklogOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                📋 Backlog ({backlog.length})
              </button>

              {isFacilitator && (
                <button
                  onClick={() => setIsTrackerModalOpen(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow ${
                    trackerConnected
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  ⚡ {activeTrackerProvider ? `${activeTrackerProvider} Connected` : 'Connect Tracker'}
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

        {/* Central Felt Poker Table */}
        <div className="flex-1 flex items-center justify-center">
          <PokerTableArena
            participants={participants}
            currentUserId={currentParticipantId}
            facilitatorId={roomState?.facilitator_id}
            phase={phase}
            roundNumber={roundNumber}
            consensus={consensus}
          />
        </div>
      </main>

      {/* Bottom Fibonacci Card Deck */}
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

      {/* Onboarding / Profile Join Modal */}
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

