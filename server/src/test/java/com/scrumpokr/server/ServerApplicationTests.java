package com.scrumpokr.server;

import com.scrumpokr.server.model.Models.*;
import com.scrumpokr.server.service.RoomHandle;
import com.scrumpokr.server.service.RoomRegistryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = ServerApplication.class)
class ServerApplicationTests {

    @Autowired
    private RoomRegistryService roomRegistry;

    @Test
    void contextLoads() {
        assertNotNull(roomRegistry);
    }

    @Test
    void testRoomCreationAndRevealGate() {
        RoomHandle room = roomRegistry.createRoom();
        assertNotNull(room.getSlug());
        assertNotNull(room.getShortCode());

        Participant alice = room.join("p-alice-123", "Alice", "avatar1", Role.FACILITATOR);
        Participant bob = room.join("p-bob-456", "Bob", "avatar2", Role.VOTER);

        assertEquals("p-alice-123", alice.id());

        // Alice votes "5"
        room.vote(alice.id(), "5");

        // Check Bob's masked view: Alice has_voted = true, but vote is NULL
        RoomState bobsView = room.getMaskedState(bob.id());
        Participant aliceInBobsView = bobsView.participants().stream()
            .filter(p -> p.id().equals(alice.id()))
            .findFirst()
            .orElseThrow();

        assertTrue(aliceInBobsView.hasVoted());
        assertNull(aliceInBobsView.vote(), "Vote must be masked from Bob prior to reveal");

        // Alice's own view: Alice can see her own vote "5"
        RoomState alicesView = room.getMaskedState(alice.id());
        Participant aliceInAlicesView = alicesView.participants().stream()
            .filter(p -> p.id().equals(alice.id()))
            .findFirst()
            .orElseThrow();

        assertEquals("5", aliceInAlicesView.vote());

        // Reveal room
        room.reveal(alice.id());

        // Check Bob's view after reveal: Alice's vote is now visible "5"
        RoomState bobsViewAfterReveal = room.getMaskedState(bob.id());
        Participant aliceAfterReveal = bobsViewAfterReveal.participants().stream()
            .filter(p -> p.id().equals(alice.id()))
            .findFirst()
            .orElseThrow();

        assertEquals("5", aliceAfterReveal.vote());
    }
}
