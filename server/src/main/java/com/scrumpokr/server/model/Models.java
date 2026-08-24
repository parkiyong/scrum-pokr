package com.scrumpokr.server.model;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class Models {

    public enum Phase {
        IDLE, VOTING, REVEALED, FINALIZED
    }

    public enum Role {
        @JsonAlias({"Estimator", "voter", "VOTER"})
        VOTER,
        @JsonAlias({"Facilitator", "facilitator", "FACILITATOR"})
        FACILITATOR,
        @JsonAlias({"Observer", "observer", "OBSERVER"})
        OBSERVER
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Story(
        String id,
        String title,
        String description,
        @JsonProperty("acceptance_criteria") List<String> acceptanceCriteria,
        @JsonProperty("points") @JsonAlias("estimate") String estimate
    ) {
        public Story(String id, String title, String description, String estimate) {
            this(id, title, description, List.of(), estimate);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PointReference(
        String points,
        String title,
        String description
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EdgeCase(
        String id,
        String text,
        boolean checked
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StoryDoctorReport(
        @JsonProperty("invest_score") int investScore,
        String summary,
        @JsonProperty("edge_cases") List<EdgeCase> edgeCases
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
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
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CreateRoomRequest() {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CreateRoomResponse(String slug, @JsonProperty("short_code") String shortCode) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JoinRequest(
        @JsonProperty("participant_id") String participantId,
        String name,
        String avatar,
        Role role
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record JoinResponse(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("room_state") RoomState roomState
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record StartVotingRequest(@JsonProperty("participant_id") String participantId) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VoteRequest(@JsonProperty("participant_id") String participantId, String vote) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RevealRequest(@JsonProperty("participant_id") String participantId) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ResetRequest(@JsonProperty("participant_id") String participantId) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FinalizeRequest(@JsonProperty("participant_id") String participantId, String estimate) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SetStoryRequest(
        @JsonProperty("participant_id") String participantId,
        Story story
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ImportBacklogRequest(
        @JsonProperty("participant_id") String participantId,
        List<Story> stories
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UpdatePointReferencesRequest(
        @JsonProperty("participant_id") String participantId,
        List<PointReference> references
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ToggleEdgeCaseRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("edge_case_id") String edgeCaseId,
        boolean checked
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UpdateRoleRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("target_id") String targetId,
        @JsonProperty("new_role") Role newRole
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TransferFacilitatorRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("target_id") String targetId
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReorderBacklogRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("story_ids") List<String> storyIds
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RemoveStoryRequest(
        @JsonProperty("participant_id") String participantId,
        @JsonProperty("story_id") String storyId
    ) {}
}
