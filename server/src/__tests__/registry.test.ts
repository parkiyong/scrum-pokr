import { describe, it, expect, vi } from 'vitest';
import { RoomRegistry } from '../room/registry';

describe('In-Memory RoomRegistry & RoomActor Lifecycle', () => {
  it('creates and resolves rooms via slug and shortCode', () => {
    const registry = new RoomRegistry();
    const room = registry.createRoom();

    expect(room.slug).toBeDefined();
    expect(room.shortCode).toBeDefined();

    expect(registry.get(room.slug)).toBe(room);
    expect(registry.get(room.shortCode)).toBe(room);
    expect(registry.get(room.shortCode.toLowerCase())).toBe(room);

    registry.stopSweeper();
  });

  it('evicts inactive rooms after TTL if no subscribers are active', () => {
    const registry = new RoomRegistry();
    const room = registry.createRoom();

    // Fast-forward lastActiveAt to 5 hours ago
    room.lastActiveAt = Date.now() - 5 * 60 * 60 * 1000;

    registry.evictInactiveRooms();
    expect(registry.get(room.slug)).toBeUndefined();

    registry.stopSweeper();
  });

  it('does not evict inactive rooms if active subscribers exist', () => {
    const registry = new RoomRegistry();
    const room = registry.createRoom();

    const unsubscribe = room.subscribe('p-1', () => {});
    room.lastActiveAt = Date.now() - 5 * 60 * 60 * 1000;

    registry.evictInactiveRooms();
    expect(registry.get(room.slug)).toBe(room);

    unsubscribe();
    registry.stopSweeper();
  });

  it('handles facilitator 5-minute failover when disconnected', () => {
    vi.useFakeTimers();
    const registry = new RoomRegistry();
    const room = registry.createRoom();

    const p1 = room.join(undefined, 'Alice', '', 'Estimator');
    const p2 = room.join(undefined, 'Bob', '', 'Estimator');

    expect(room.getState().facilitator_id).toBe(p1.id);

    // Alice disconnects
    room.handleParticipantDisconnect(p1.id);

    // Fast-forward 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(room.getState().facilitator_id).toBe(p2.id);

    vi.useRealTimers();
    registry.stopSweeper();
  });
});
