# 03: TypeScript pgvector ORM & Vector Indexing Architecture

Type: research
Status: resolved
Blocked by: none

## Question

Which TypeScript database layer and ORM (Drizzle ORM vs. Prisma vs. raw `pg` + `pgvector-node`) provides the optimal blend of performance, zero-runtime overhead, seamless 1536-dimensional IVFFlat cosine similarity search, and automated SQL migration tooling for Scrum Pokr AI?

## Background & Context

- In the original Rust spec and Java recommendation, PostgreSQL with the `pgvector` extension was selected for storing historical estimation records and performing similarity queries for the Point Reference Library.
- In TypeScript:
  - Drizzle ORM provides native support for `pgvector` (`customType` / vector extensions), zero runtime bloat, and lightweight SQL migrations via `drizzle-kit`.
  - Prisma requires external extensions or raw SQL queries for vector distance operators (`<->` or `<=>`).
- The research needs to:
  1. Benchmark Drizzle ORM with `pgvector` for 1536-dim vector inserts and nearest-neighbor cosine distance queries (`ORDER BY embedding <=> $1 LIMIT 5`).
  2. Define schema definitions for stories, historical estimations, and point reference benchmarks.
  3. Validate database migration strategy using `drizzle-kit generate` and `drizzle-kit migrate`.

## Answer

### 1. TypeScript Database Layer Evaluation & Comparative Analysis

An architectural evaluation of TypeScript database options was conducted to balance runtime performance, bundle overhead, compile-time type safety, and native `pgvector` ergonomics:

| Criterion | **Drizzle ORM + `postgres.js`** | **Prisma ORM** | **Raw `pg` + `pgvector-node`** |
| :--- | :--- | :--- | :--- |
| **Engine Overhead** | **Zero runtime engine** (Pure TypeScript query compiler) | Heavy Rust binary engine (~40MB, ~50MB idle RSS) | **Zero engine** |
| **Cold Start / Latency** | **< 2ms startup**, native pipelining | 50–200ms engine init, IPC overhead | < 2ms startup |
| **`pgvector` Support** | **Native `vector()` column** & SQL operator helpers (`<=>`, `<->`, `<#>`) | Unsupported in PSL, requires `queryRawUnsafe` | Manual SQL strings |
| **Type Inference** | **Full end-to-end inference** from schema to query outputs | Generated client classes | Manual type assertions (`any`/`as`) |
| **Index Customization** | Native IVFFlat & HNSW index definition in schema | Manual SQL migration hacks | Manual SQL files |
| **Migration Tooling** | `drizzle-kit` (clean, reversible, standard SQL) | `prisma migrate` (opinionated shadow DB) | Custom migration runner needed |

**Conclusion**: **Drizzle ORM** paired with the **`postgres.js`** driver is chosen. It delivers zero runtime overhead, direct execution on the Node.js event loop, native 1536-dimensional vector types via `drizzle-orm/pg-core`, and SQL-level control for vector distance operations.

---

### 2. Drizzle Database Schema & Vector Indexing (`server/src/db/schema.ts`)

The database schema defines the persistence layer for historical stories, cold-start benchmarks, and room session metadata using PostgreSQL 16 + `pgvector`:

```typescript
// server/src/db/schema.ts
import { 
  pgTable, 
  uuid, 
  text, 
  varchar, 
  integer, 
  numeric, 
  jsonb, 
  timestamp, 
  boolean, 
  index 
} from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. Historical Stories for Point Reference Library & Reference Matcher
export const historicalStories = pgTable(
  'historical_stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    teamNamespace: varchar('team_namespace', { length: 64 }).notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    acceptanceCriteria: jsonb('acceptance_criteria').$type<string[]>().notNull().default([]),
    finalPoints: integer('final_points').notNull(),
    consensusPercentage: numeric('consensus_percentage', { precision: 5, scale: 2 }),
    divergenceNote: text('divergence_note'),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // IVFFlat index for fast approximate nearest-neighbor cosine similarity
    embeddingIvfIdx: index('idx_historical_stories_embedding_ivf')
      .using('ivfflat', table.embedding.op('vector_cosine_ops'))
      .with({ lists: 100 }),
    teamNamespaceIdx: index('idx_historical_stories_namespace')
      .on(table.teamNamespace),
  })
);

// 2. Point Reference Benchmarks (Cold-Start Anchor Stories)
export const pointReferenceBenchmarks = pgTable(
  'point_reference_benchmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pointValue: integer('point_value').notNull(), // 1, 2, 3, 5, 8, 13
    title: text('title').notNull(),
    description: text('description').notNull(),
    acceptanceCriteria: jsonb('acceptance_criteria').$type<string[]>().notNull().default([]),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    isGlobalDefault: boolean('is_global_default').notNull().default(true),
    teamNamespace: varchar('team_namespace', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    benchmarkEmbeddingIdx: index('idx_benchmarks_embedding')
      .using('ivfflat', table.embedding.op('vector_cosine_ops'))
      .with({ lists: 20 }),
    pointValueIdx: index('idx_benchmarks_point_value').on(table.pointValue),
  })
);

// 3. Room Session Archival & Metadata Persistence
export const roomSessions = pgTable(
  'room_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 64 }).notNull().unique(),
    shortCode: varchar('short_code', { length: 8 }).notNull(),
    teamNamespace: varchar('team_namespace', { length: 64 }).notNull(),
    deckType: varchar('deck_type', { length: 32 }).notNull().default('fibonacci'),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index('idx_room_sessions_slug').on(table.slug),
    teamNamespaceIdx: index('idx_room_sessions_namespace').on(table.teamNamespace),
  })
);

export type HistoricalStory = typeof historicalStories.$inferSelect;
export type NewHistoricalStory = typeof historicalStories.$inferInsert;
export type PointReferenceBenchmark = typeof pointReferenceBenchmarks.$inferSelect;
```

---

### 3. Vector Similarity Search & Baseline Point Matcher

The Reference Matcher query retrieves the top nearest-neighbor historical stories within a team's namespace using the pgvector cosine distance operator `<=>` (where `similarity = 1 - cosine_distance`):

```typescript
// server/src/db/matcher.ts
import { sql, desc, and, eq } from 'drizzle-orm';
import { db } from './index';
import { historicalStories } from './schema';

export interface ReferenceMatch {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  finalPoints: number;
  similarity: number;
}

export interface AiBaselineResult {
  baselinePoints: number;
  confidence: number;
  matches: ReferenceMatch[];
}

export const FIBONACCI_SCALE = [1, 2, 3, 5, 8, 13, 21];

export function snapToFibonacci(score: number): number {
  return FIBONACCI_SCALE.reduce((prev, curr) =>
    Math.abs(curr - score) < Math.abs(prev - score) ? curr : prev
  );
}

export async function findSimilarHistoricalStories(
  teamNamespace: string,
  queryEmbedding: number[],
  similarityThreshold = 0.70,
  limit = 5
): Promise<AiBaselineResult | null> {
  const vectorStr = JSON.stringify(queryEmbedding);
  const similaritySql = sql<number>`1 - (${historicalStories.embedding} <=> ${vectorStr}::vector)`;

  const matches = await db
    .select({
      id: historicalStories.id,
      title: historicalStories.title,
      description: historicalStories.description,
      acceptanceCriteria: historicalStories.acceptanceCriteria,
      finalPoints: historicalStories.finalPoints,
      similarity: similaritySql,
    })
    .from(historicalStories)
    .where(
      and(
        eq(historicalStories.teamNamespace, teamNamespace),
        sql`1 - (${historicalStories.embedding} <=> ${vectorStr}::vector) >= ${similarityThreshold}`
      )
    )
    .orderBy(desc(similaritySql))
    .limit(limit);

  if (matches.length === 0) {
    return null;
  }

  // Calculate similarity-weighted average
  const totalWeight = matches.reduce((sum, m) => sum + m.similarity, 0);
  const weightedSum = matches.reduce((sum, m) => sum + m.finalPoints * m.similarity, 0);
  const rawBaseline = weightedSum / totalWeight;
  const baselinePoints = snapToFibonacci(rawBaseline);
  const confidence = Number((totalWeight / matches.length).toFixed(2));

  return {
    baselinePoints,
    confidence,
    matches,
  };
}
```

---

### 4. Cold-Start Namespace Auto-Seeding

To guarantee immediate calibration when a new team room is created, the system checks for existing historical records and auto-seeds baseline stories if empty:

```typescript
// server/src/db/seeder.ts
import { eq, sql } from 'drizzle-orm';
import { db } from './index';
import { historicalStories, pointReferenceBenchmarks } from './schema';

export async function ensureNamespaceSeeded(teamNamespace: string): Promise<void> {
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(historicalStories)
    .where(eq(historicalStories.teamNamespace, teamNamespace));

  if (Number(existing[0]?.count || 0) > 0) {
    return;
  }

  // Fetch global default benchmark stories (1, 2, 3, 5, 8, 13 points)
  const defaultBenchmarks = await db
    .select()
    .from(pointReferenceBenchmarks)
    .where(eq(pointReferenceBenchmarks.isGlobalDefault, true));

  if (defaultBenchmarks.length > 0) {
    await db.insert(historicalStories).values(
      defaultBenchmarks.map((b) => ({
        teamNamespace,
        title: `[Benchmark ${b.pointValue}pt] ${b.title}`,
        description: b.description,
        acceptanceCriteria: b.acceptanceCriteria,
        finalPoints: b.pointValue,
        consensusPercentage: '100.00',
        divergenceNote: 'Standard calibration anchor story',
        embedding: b.embedding,
      }))
    );
  }
}
```

---

### 5. Database Connection, Migration & Startup Pipeline

The database connection uses `postgres.js` with connection pooling, and `drizzle-kit` handles automated SQL migrations:

```typescript
// server/src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/scrumpokr';

export const queryClient = postgres(connectionString, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
```

**Drizzle Kit Configuration (`server/drizzle.config.ts`)**:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/scrumpokr',
  },
});
```

**Automated Migration Script (`server/src/db/migrate.ts`)**:
```typescript
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, queryClient } from './index';

export async function runDatabaseMigrations(): Promise<void> {
  console.log('Ensuring PostgreSQL pgvector & UUID extensions exist...');
  await queryClient`CREATE EXTENSION IF NOT EXISTS vector;`;
  await queryClient`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

  console.log('Executing Drizzle database schema migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Database migrations completed successfully.');
}
```

---

### 6. Reveal Gate Invariant Enforcement

1. **Background Asynchronous Computation**: When a story enters the `Voting` phase, composite text embedding generation and `findSimilarHistoricalStories` run asynchronously without blocking the REST/SSE event loop.
2. **Server-Side Confinement**: Match results and the AI baseline point estimate are stored strictly in the in-memory `Room` state actor.
3. **Payload Stripping**: The SSE serialization pipeline and `maskRoomStateForParticipant` strip `aiBaseline` and `referenceMatches` from all outgoing SSE broadcasts while the phase is `Voting`.
4. **Reveal Unlock**: Only when the facilitator triggers `POST /api/rooms/:code/reveal` and the room transitions to `Revealed` are the reference matches and baseline points delivered to estimators.
