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
  index,
} from 'drizzle-orm/pg-core';
import { vector } from 'drizzle-orm/pg-core';

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
    embeddingIvfIdx: index('idx_historical_stories_embedding_ivf')
      .using('ivfflat', table.embedding.op('vector_cosine_ops'))
      .with({ lists: 100 }),
    teamNamespaceIdx: index('idx_historical_stories_namespace')
      .on(table.teamNamespace),
  })
);

export const pointReferenceBenchmarks = pgTable(
  'point_reference_benchmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pointValue: integer('point_value').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    acceptanceCriteria: jsonb('acceptance_criteria').$type<string[]>().notNull().default([]),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    isGlobalDefault: boolean('is_global_default').notNull().default(true),
    teamNamespace: varchar('team_namespace', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pointValueIdx: index('idx_benchmarks_point_value').on(table.pointValue),
  })
);

export type HistoricalStory = typeof historicalStories.$inferSelect;
export type NewHistoricalStory = typeof historicalStories.$inferInsert;
export type PointReferenceBenchmark = typeof pointReferenceBenchmarks.$inferSelect;
