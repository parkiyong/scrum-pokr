import { queryClient } from './index';

export async function runMigrations() {
  console.log('Running database schema migrations...');
  try {
    await queryClient`CREATE EXTENSION IF NOT EXISTS vector;`;

    await queryClient`
      CREATE TABLE IF NOT EXISTS historical_stories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_namespace VARCHAR(64) NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        acceptance_criteria JSONB NOT NULL DEFAULT '[]',
        final_points INTEGER NOT NULL,
        consensus_percentage NUMERIC(5, 2),
        divergence_note TEXT,
        embedding vector(1536),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await queryClient`
      CREATE TABLE IF NOT EXISTS point_reference_benchmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        point_value INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        acceptance_criteria JSONB NOT NULL DEFAULT '[]',
        embedding vector(1536) NOT NULL,
        is_global_default BOOLEAN NOT NULL DEFAULT true,
        team_namespace VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    console.log('✅ Migrations completed successfully.');
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  } finally {
    await queryClient.end();
  }
}

if (process.env.NODE_ENV !== 'test') {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
