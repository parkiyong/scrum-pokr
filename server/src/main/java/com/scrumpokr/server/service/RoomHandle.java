package com.scrumpokr.server.service;

import com.scrumpokr.server.model.Models.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantLock;

public class RoomHandle {

    private final String slug;
    private final String shortCode;
    private final ReentrantLock lock = new ReentrantLock();

    private Phase phase = Phase.IDLE;
    private Story currentStory = new Story("story-1", "Sample User Story", "As a user, I want...", null);
    private final List<Story> backlog = new ArrayList<>();
    private List<PointReference> pointReferences = new ArrayList<>(List.of(
        new PointReference("1", "T-Shirt S / Micro task", "Simple, low risk change"),
        new PointReference("3", "Medium Story", "Clear requirements, moderate effort"),
        new PointReference("5", "Large Story", "Requires decomposition or spike")
    ));
    private StoryDoctorReport storyDoctorReport = new StoryDoctorReport(85, "Good story structure", List.of(
        new EdgeCase("ec-1", "Check network disconnects during voting", false),
        new EdgeCase("ec-2", "Verify empty vote payload handling", false)
    ));

    private String facilitatorId = "";
    private final Map<String, Participant> participants = new LinkedHashMap<>();
    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public RoomHandle(String slug, String shortCode) {
        this.slug = slug;
        this.shortCode = shortCode;
    }

    public String getSlug() {
        return slug;
    }

    public String getShortCode() {
        return shortCode;
    }

    public Participant join(String requestedId, String name, String avatar, Role role) {
        lock.lock();
        try {
            String participantId = (requestedId != null && !requestedId.isBlank())
                ? requestedId
                : "p-" + UUID.randomUUID().toString().substring(0, 8);

            Role assignedRole = role != null ? role : Role.VOTER;
            if (participants.isEmpty() || facilitatorId.isBlank()) {
                facilitatorId = participantId;
                assignedRole = Role.FACILITATOR;
            }

            Participant p = new Participant(participantId, name, avatar, assignedRole, false, null);
            participants.put(participantId, p);
            broadcastState();
            return p;
        } finally {
            lock.unlock();
        }
    }

    public void startVoting(String participantId) {
        lock.lock();
        try {
            this.phase = Phase.VOTING;
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void vote(String participantId, String voteValue) {
        lock.lock();
        try {
            Participant p = participants.get(participantId);
            if (p != null) {
                boolean hasVoted = voteValue != null && !voteValue.isBlank();
                participants.put(participantId, new Participant(p.id(), p.name(), p.avatar(), p.role(), hasVoted, voteValue));
                if (this.phase == Phase.IDLE && hasVoted) {
                    this.phase = Phase.VOTING;
                }
                broadcastState();
            }
        } finally {
            lock.unlock();
        }
    }

    public void reveal(String participantId) {
        lock.lock();
        try {
            this.phase = Phase.REVEALED;
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void reset(String participantId) {
        lock.lock();
        try {
            this.phase = Phase.IDLE;
            for (String pid : new ArrayList<>(participants.keySet())) {
                Participant p = participants.get(pid);
                participants.put(pid, new Participant(p.id(), p.name(), p.avatar(), p.role(), false, null));
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void finalizeStory(String participantId, String estimate) {
        lock.lock();
        try {
            this.phase = Phase.FINALIZED;
            if (this.currentStory != null) {
                this.currentStory = new Story(currentStory.id(), currentStory.title(), currentStory.description(), estimate);
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void setStory(String participantId, Story story) {
        lock.lock();
        try {
            this.currentStory = story;
            this.phase = Phase.IDLE;
            for (String pid : new ArrayList<>(participants.keySet())) {
                Participant p = participants.get(pid);
                participants.put(pid, new Participant(p.id(), p.name(), p.avatar(), p.role(), false, null));
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void importBacklog(String participantId, List<Story> stories) {
        lock.lock();
        try {
            if (stories != null) {
                this.backlog.clear();
                this.backlog.addAll(stories);
                if (this.currentStory == null && !this.backlog.isEmpty()) {
                    this.currentStory = this.backlog.get(0);
                }
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void updatePointReferences(String participantId, List<PointReference> references) {
        lock.lock();
        try {
            if (references != null) {
                this.pointReferences = new ArrayList<>(references);
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void toggleEdgeCase(String participantId, String edgeCaseId, boolean checked) {
        lock.lock();
        try {
            if (storyDoctorReport != null && storyDoctorReport.edgeCases() != null) {
                List<EdgeCase> updated = storyDoctorReport.edgeCases().stream()
                    .map(ec -> ec.id().equals(edgeCaseId) ? new EdgeCase(ec.id(), ec.text(), checked) : ec)
                    .toList();
                this.storyDoctorReport = new StoryDoctorReport(storyDoctorReport.investScore(), storyDoctorReport.summary(), updated);
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void updateRole(String participantId, String targetId, Role newRole) {
        lock.lock();
        try {
            Participant target = participants.get(targetId);
            if (target != null && newRole != null) {
                participants.put(targetId, new Participant(target.id(), target.name(), target.avatar(), newRole, target.hasVoted(), target.vote()));
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void transferFacilitator(String participantId, String targetId) {
        lock.lock();
        try {
            Participant target = participants.get(targetId);
            if (target != null) {
                this.facilitatorId = targetId;
                participants.put(targetId, new Participant(target.id(), target.name(), target.avatar(), Role.FACILITATOR, target.hasVoted(), target.vote()));
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void reorderBacklog(String participantId, List<String> storyIds) {
        lock.lock();
        try {
            if (storyIds != null && !storyIds.isEmpty()) {
                Map<String, Story> map = new HashMap<>();
                for (Story s : backlog) {
                    map.put(s.id(), s);
                }
                List<Story> newBacklog = new ArrayList<>();
                for (String id : storyIds) {
                    if (map.containsKey(id)) {
                        newBacklog.add(map.get(id));
                    }
                }
                this.backlog.clear();
                this.backlog.addAll(newBacklog);
            }
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public void removeStoryFromBacklog(String participantId, String storyId) {
        lock.lock();
        try {
            this.backlog.removeIf(s -> s.id().equals(storyId));
            broadcastState();
        } finally {
            lock.unlock();
        }
    }

    public RoomState getRawState() {
        lock.lock();
        try {
            return new RoomState(
                slug, shortCode, phase, new ArrayList<>(participants.values()),
                currentStory, new ArrayList<>(backlog), new ArrayList<>(pointReferences),
                storyDoctorReport, facilitatorId
            );
        } finally {
            lock.unlock();
        }
    }

    public RoomState getMaskedState(String requestingParticipantId) {
        return getRawState().toMaskedState(requestingParticipantId);
    }

    public void subscribe(String participantId, SseEmitter emitter) {
        if (participantId != null && !participantId.isBlank()) {
            emitters.computeIfAbsent(participantId, k -> new CopyOnWriteArrayList<>()).add(emitter);
            try {
                emitter.send(SseEmitter.event()
                    .name("room_state")
                    .data(getMaskedState(participantId)));
            } catch (IOException ignored) {}
        }
    }

    public void unsubscribe(String participantId, SseEmitter emitter) {
        if (participantId != null) {
            List<SseEmitter> list = emitters.get(participantId);
            if (list != null) {
                list.remove(emitter);
                if (list.isEmpty()) {
                    emitters.remove(participantId);
                }
            }
        }
    }

    public void broadcastState() {
        RoomState raw = getRawState();
        emitters.forEach((pid, list) -> {
            RoomState masked = raw.toMaskedState(pid);
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event()
                        .name("room_state")
                        .data(masked));
                } catch (IOException e) {
                    list.remove(emitter);
                }
            }
        });
    }
}
