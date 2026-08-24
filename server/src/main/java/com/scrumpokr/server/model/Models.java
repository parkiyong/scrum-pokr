package com.scrumpokr.server.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

public class Models {

    public enum Phase {
        IDLE, VOTING, REVEALED, FINALIZED
    }

    public enum Role {
        VOTER, FACILITATOR, OBSERVER
    }

    public record Participant(
        String id,
        String name,
        String avatar,
        Role role,
        @JsonProperty("has_voted") boolean hasVoted,
        String vote
    ) {
        public Participant toMasked(boolean isRevealed, boolean isSelf) {
            if (isRevealed || isSelf) {
                return this;
            }
            return new Participant(id, name, avatar, role, hasVoted, null);
        }
    }

    public record Story(
        String id,
        String title,
        String description,
        @JsonProperty("points") @JsonAlias("estimate") String estimate
    ) {}

    public record PointReference(
        String points,
        String title,
        String description
    ) {}

    public record EdgeCase(
        String id,
        String text,
        boolean checked
    ) {}

    public record StoryDoctorReport(
        @JsonProperty("invest_score") int investScore,
        String summary,
        @JsonProperty("edge_cases") List<EdgeCase> edgeCases
    ) {}

    public record RoomState(
        String slug,
        @JsonProperty("short_code") String shortCode,
        Phase phase,
        List<Participant> participants,
        @JsonProperty("current_story") Story currentStory,
        List<Story> backlog,
        @JsonProperty("point_references") List<PointReference> pointReferences,
        @JsonProperty("story_doctor_report") StoryDoctorReport storyDoctorReport,
        @JsonProperty("facilitator_id") String facilitatorId
    ) {
        public RoomState toMaskedState(String requestingParticipantId) {
            boolean isRevealed = (this.phase == Phase.REVEALED || this.phase == Phase.FINALIZED);
            List<Participant> maskedParticipants = participants.stream()
                .map(p -> p.toMasked(isRevealed, p.id().equals(requestingParticipantId)))
                .toList();

            return new RoomState(
                slug, shortCode, phase, maskedParticipants, currentStory,
                backlog, pointReferences, storyDoctorReport, facilitatorId
            );
        }
    }

    // Command payloads
    public record CreateRoomRequest() {}
    public record CreateRoomResponse(String slug, @JsonProperty("short_code") String shortCode) {}

    public record JoinRequest(
        @JsonProperty("participant_id") String participantId,
        String name,
        String avatar,
        Role role
    ) {}

    public record JoinResponse(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("room_state") RoomState roomState
    ) {}

    public record StartVotingRequest(@JsonProperty("participant_id") String participantId) {}
    public record VoteRequest(@JsonProperty("participant_id") String participantId, String vote) {}
    public record RevealRequest(@JsonProperty("participant_id") String participantId) {}
    public record ResetRequest(@JsonProperty("participant_id") String participantId) {}
    public record FinalizeRequest(@JsonProperty("participant_id") String participantId, String estimate) {}
    public record SetStoryRequest(
        @JsonProperty("participant_id") String participantId,
        Story story
    ) {}
    public record ImportBacklogRequest(
        @JsonProperty("participant_id") String participantId,
        List<Story> stories
    ) {}
    public record UpdatePointReferencesRequest(
        @JsonProperty("participant_id") String participantId,
        List<PointReference> references
    ) {}
    public record ToggleEdgeCaseRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("edge_case_id") String edgeCaseId,
        boolean checked
    ) {}
    public record UpdateRoleRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("target_id") String targetId,
        @JsonProperty("new_role") Role newRole
    ) {}
    public record TransferFacilitatorRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("target_id") String targetId
    ) {}
    public record ReorderBacklogRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("story_ids") List<String> storyIds
    ) {}
    public record RemoveStoryRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("story_id") String storyId
    ) {}
}
