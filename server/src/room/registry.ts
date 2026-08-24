import { generateRoomSlug } from '../util/slug';
import { RoomActor } from './room-actor';

const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export class RoomRegistry {
  private rooms: Map<string, RoomActor> = new Map();
  private codeIndex: Map<string, string> = new Map(); // shortCode (normalized) -> slug
  private sweeperInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startSweeper();
  }

  public createRoom(): RoomActor {
    let slug = '';
    let shortCode = '';

    // Guarantee unique slug and shortCode
    do {
      const generated = generateRoomSlug();
      slug = generated.slug;
      shortCode = generated.shortCode;
    } while (this.rooms.has(slug) || this.codeIndex.has(shortCode.toUpperCase()));

    const actor = new RoomActor(slug, shortCode);

    this.rooms.set(slug, actor);
    this.codeIndex.set(shortCode.toUpperCase(), slug);
    this.codeIndex.set(slug.toLowerCase(), slug);

    return actor;
  }

  public get(code: string): RoomActor | undefined {
    if (!code) return undefined;
    const normalized = code.trim();
    const slug = this.codeIndex.get(normalized.toUpperCase()) || this.codeIndex.get(normalized.toLowerCase()) || normalized;
    return this.rooms.get(slug);
  }

  public getOrCreate(code: string): RoomActor {
    const existing = this.get(code);
    if (existing) {
      existing.lastActiveAt = Date.now();
      return existing;
    }

    const normalized = code.trim();
    const shortCode = normalized.toUpperCase();
    const actor = new RoomActor(normalized, shortCode);

    this.rooms.set(normalized, actor);
    this.codeIndex.set(shortCode, normalized);
    this.codeIndex.set(normalized.toLowerCase(), normalized);

    return actor;
  }

  private startSweeper(): void {
    if (typeof setInterval !== 'undefined') {
      this.sweeperInterval = setInterval(() => {
        this.evictInactiveRooms();
      }, 10 * 60 * 1000); // 10 minutes
      if (this.sweeperInterval.unref) {
        this.sweeperInterval.unref();
      }
    }
  }

  public stopSweeper(): void {
    if (this.sweeperInterval) {
      clearInterval(this.sweeperInterval);
      this.sweeperInterval = null;
    }
  }

  public evictInactiveRooms(): void {
    const now = Date.now();
    for (const [slug, room] of this.rooms.entries()) {
      // Do not evict rooms that still have active SSE subscribers
      if (now - room.lastActiveAt > ROOM_TTL_MS && !room.hasSubscribers()) {
        room.closeAllSubscribers();
        this.rooms.delete(slug);
        this.codeIndex.delete(room.shortCode.toUpperCase());
        this.codeIndex.delete(slug.toLowerCase());
      }
    }
  }

  public size(): number {
    return this.rooms.size;
  }
}

export const roomRegistry = new RoomRegistry();
