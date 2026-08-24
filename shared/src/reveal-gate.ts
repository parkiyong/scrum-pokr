import type { ConsensusCategory, ConsensusSummary, Participant, RoomState } from './domain';

export function computeConsensus(participants: Participant[]): ConsensusSummary | null {
  const votes = participants
    .filter((p) => p.vote !== undefined && p.vote !== null && p.vote !== '' && p.vote !== '?')
    .map((p) => String(p.vote));

  if (votes.length === 0) return null;

  const counts: Record<string, number> = {};
  votes.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });

  let mode = votes[0];
  let maxCount = 0;
  Object.entries(counts).forEach(([val, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mode = val;
    }
  });

  const consensusPct = Math.round((maxCount / votes.length) * 100);

  const numVotes = votes.map((v) => parseFloat(v)).filter((n) => !isNaN(n));
  let minVote: string | undefined;
  let maxVote: string | undefined;
  let spread: number | undefined;

  if (numVotes.length > 0) {
    const minN = Math.min(...numVotes);
    const maxN = Math.max(...numVotes);
    minVote = String(minN);
    maxVote = String(maxN);
    spread = maxN - minN;
  }

  let category: ConsensusCategory = 'Consensus';
  if (consensusPct === 100) {
    category = 'Consensus';
  } else if (spread !== undefined && spread > 5) {
    category = 'WideSpread';
  } else if (consensusPct >= 60) {
    category = 'HighOutlier';
  } else {
    category = 'BimodalSplit';
  }

  return {
    category,
    suggested_points: mode,
    consensus_pct: consensusPct,
    agreement_count: maxCount,
    total_votes: votes.length,
    min_vote: minVote,
    max_vote: maxVote,
  };
}

export function maskRoomStateForParticipant(state: RoomState, requestingParticipantId: string): RoomState {
  if (state.phase === 'Revealed' || state.phase === 'Finalized' || state.phase === 'Discussing' || state.phase === 'Slicing') {
    return {
      ...state,
      consensus: state.consensus || computeConsensus(state.participants),
    };
  }

  return {
    ...state,
    consensus: null,
    participants: state.participants.map((p) => {
      const isSelf = p.id === requestingParticipantId;
      return {
        ...p,
        vote: isSelf ? p.vote : null,
        has_voted: p.vote !== null && p.vote !== undefined && p.vote !== '',
      };
    }),
  };
}
