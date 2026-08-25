import React, { useState } from 'react';
import { BacklogDrawer } from '../components/BacklogDrawer';
import { DeckConfigModal } from '../components/DeckConfigModal';
import { DeckSelector } from '../components/DeckSelector';
import { FacilitatorBar } from '../components/FacilitatorBar';
import { Header } from '../components/Header';
import { JoinModal } from '../components/JoinModal';
import { PokerTableArena } from '../components/PokerTableArena';
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
    joinRoom,
    startVoting,
    castVote,
    retractVote,
    revealCards,
    triggerReVote,
    finalizeStory,
    nextStory,
    setDeck,
    selectStoryById,
    addStory,
    removeStory,
    reorderBacklog,
  } = useRoomSocket(slug);

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(!myProfile);
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  const [isDeckConfigOpen, setIsDeckConfigOpen] = useState(false);

  const myParticipant =
    roomState?.participants.find((p) => p.id === currentParticipantId) ||
    (myProfile
      ? {
          id: currentParticipantId,
          name: myProfile.nickname,
          avatar: myProfile.avatar || '',
          role: myProfile.role || 'Estimator',
          connected: true,
          has_voted: false,
          vote: null,
        }
      : undefined);
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
  const participants = roomState?.participants || [];
  const consensus = roomState?.consensus;
  const currentStory = roomState?.current_story;
  const backlog = roomState?.backlog || [];
  const deck = roomState?.deck;

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
      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-4 py-4 flex flex-col">
        {/* Active Story Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 mb-3 shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                  {currentStory?.points && (
                    <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-md">
                      {currentStory.points} pts
                    </span>
                  )}

                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                    {currentStory?.title || 'No Active Story Selected'}
                  </h2>
                </div>

                <p className="text-xs text-slate-500 font-normal leading-relaxed">
                  {currentStory?.description || 'Use the backlog queue to select or create user stories for estimation.'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
              {isFacilitator && (
                <button
                  onClick={() => setIsDeckConfigOpen(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
                  title="Configure Deck"
                >
                  ⚙️ Deck ({deck?.type || 'fibonacci'})
                </button>
              )}

              <button
                onClick={() => setIsBacklogOpen(true)}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                📋 Backlog ({backlog.length})
              </button>
            </div>
          </div>
        </div>

        {/* Facilitator Controls Bar */}
        <FacilitatorBar
          phase={phase}
          activeStory={currentStory}
          onStartVoting={startVoting}
          onRevealCards={revealCards}
          onTriggerReVote={triggerReVote}
          onFinalize={() => finalizeStory()}
          onNextStory={nextStory}
          onOpenDeckConfig={() => setIsDeckConfigOpen(true)}
          isFacilitator={isFacilitator}
        />

        {/* Virtual Poker Table Arena */}
        <div className="w-full flex flex-col items-center justify-center my-2">
          <PokerTableArena
            participants={participants.length > 0 ? participants : [
              {
                id: currentParticipantId,
                name: myProfile?.nickname || 'Estimator',
                avatar: myProfile?.avatar || '',
                role: myProfile?.role || 'Estimator',
                connected: true,
                has_voted: false,
                vote: null,
              },
            ]}
            currentUserId={currentParticipantId}
            facilitatorId={roomState?.facilitator_id || currentParticipantId}
            phase={phase}
            consensus={consensus}
          />
        </div>

        {/* Pick Card Deck Docked directly under the table */}
        {myParticipant?.role !== 'Observer' && (
          <DeckSelector
            deck={deck}
            selectedCard={myVote}
            onSelectCard={handleCardClick}
            disabled={phase !== 'Voting'}
          />
        )}
      </main>

      {/* Backlog Drawer */}
      <BacklogDrawer
        isOpen={isBacklogOpen}
        onClose={() => setIsBacklogOpen(false)}
        backlog={backlog}
        activeStoryId={currentStory?.id}
        isFacilitator={isFacilitator}
        onSelectStory={(id) => {
          selectStoryById(id);
          setIsBacklogOpen(false);
        }}
        onAddStory={async (title, desc) => {
          await addStory(title, desc);
        }}
        onReorder={reorderBacklog}
        onRemove={removeStory}
      />

      {/* Deck Configuration Modal */}
      {deck && (
        <DeckConfigModal
          isOpen={isDeckConfigOpen}
          onClose={() => setIsDeckConfigOpen(false)}
          currentDeck={deck}
          onSelectDeck={setDeck}
        />
      )}

      {/* Profile Join Modal */}
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
