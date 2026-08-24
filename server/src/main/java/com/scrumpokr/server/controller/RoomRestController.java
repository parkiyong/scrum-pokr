package com.scrumpokr.server.controller;

import com.scrumpokr.server.model.Models.*;
import com.scrumpokr.server.service.RoomHandle;
import com.scrumpokr.server.service.RoomRegistryService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomRestController {

    private final RoomRegistryService roomRegistry;

    public RoomRestController(RoomRegistryService roomRegistry) {
        this.roomRegistry = roomRegistry;
    }

    @PostMapping
    public CreateRoomResponse createRoom() {
        RoomHandle handle = roomRegistry.createRoom();
        return new CreateRoomResponse(handle.getSlug(), handle.getShortCode());
    }

    @GetMapping("/{code}")
    public RoomState getRoomState(
        @PathVariable String code,
        @RequestParam(required = false, defaultValue = "") String participantId
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        return handle.getMaskedState(participantId);
    }

    @PostMapping("/{code}/join")
    public JoinResponse joinRoom(
        @PathVariable String code,
        @RequestBody JoinRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        Participant p = handle.join(request.participantId(), request.name(), request.avatar(), request.role());
        RoomState state = handle.getMaskedState(p.id());
        return new JoinResponse(p.id(), state);
    }

    @PostMapping("/{code}/start-voting")
    public Map<String, Object> startVoting(
        @PathVariable String code,
        @RequestBody StartVotingRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.startVoting(request.participantId());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/vote")
    public Map<String, Object> vote(
        @PathVariable String code,
        @RequestBody VoteRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.vote(request.participantId(), request.vote());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/reveal")
    public Map<String, Object> reveal(
        @PathVariable String code,
        @RequestBody RevealRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.reveal(request.participantId());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/reset")
    public Map<String, Object> reset(
        @PathVariable String code,
        @RequestBody ResetRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.reset(request.participantId());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/finalize")
    public Map<String, Object> finalizeStory(
        @PathVariable String code,
        @RequestBody FinalizeRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.finalizeStory(request.participantId(), request.estimate());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/story")
    public Map<String, Object> setStory(
        @PathVariable String code,
        @RequestBody SetStoryRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.setStory(request.participantId(), request.story());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/import-backlog")
    public Map<String, Object> importBacklog(
        @PathVariable String code,
        @RequestBody ImportBacklogRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.importBacklog(request.participantId(), request.stories());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/point-references")
    public Map<String, Object> updatePointReferences(
        @PathVariable String code,
        @RequestBody UpdatePointReferencesRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.updatePointReferences(request.participantId(), request.references());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/edge-case")
    public Map<String, Object> toggleEdgeCase(
        @PathVariable String code,
        @RequestBody ToggleEdgeCaseRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.toggleEdgeCase(request.participantId(), request.edgeCaseId(), request.checked());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/role")
    public Map<String, Object> updateRole(
        @PathVariable String code,
        @RequestBody UpdateRoleRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.updateRole(request.participantId(), request.targetId(), request.newRole());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/transfer-facilitator")
    public Map<String, Object> transferFacilitator(
        @PathVariable String code,
        @RequestBody TransferFacilitatorRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.transferFacilitator(request.participantId(), request.targetId());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/reorder-backlog")
    public Map<String, Object> reorderBacklog(
        @PathVariable String code,
        @RequestBody ReorderBacklogRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.reorderBacklog(request.participantId(), request.storyIds());
        return Map.of("success", true);
    }

    @PostMapping("/{code}/remove-story")
    public Map<String, Object> removeStoryFromBacklog(
        @PathVariable String code,
        @RequestBody RemoveStoryRequest request
    ) {
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.removeStoryFromBacklog(request.participantId(), request.storyId());
        return Map.of("success", true);
    }

    @GetMapping(value = "/{code}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(
        @PathVariable String code,
        @RequestParam(required = false, defaultValue = "") String participantId
    ) {
        SseEmitter emitter = new SseEmitter(-1L);
        RoomHandle handle = roomRegistry.getOrCreate(code);
        handle.subscribe(participantId, emitter);

        emitter.onCompletion(() -> handle.unsubscribe(participantId, emitter));
        emitter.onTimeout(() -> handle.unsubscribe(participantId, emitter));
        emitter.onError(ex -> handle.unsubscribe(participantId, emitter));

        return emitter;
    }
}
