import { queryClient } from './index';

// 1536-dimensional mock embedding generator for seeding benchmarks
function createMockEmbedding(seed: number): number[] {
  const arr = new Array(1536).fill(0);
  for (let i = 0; i < 1536; i++) {
    arr[i] = Math.sin(seed * (i + 1)) * 0.05;
  }
  return arr;
}

export async function runSeed() {
  console.log('Seeding point reference benchmarks...');
  try {
    const benchmarks = [
      {
        pointValue: 1,
        title: 'T-Shirt S / Micro task',
        description: 'Simple text, copy, or config tweak with zero dependencies and trivial verification.',
        criteria: JSON.stringify(['Zero side effects', 'Completed in < 1 hour']),
        embedding: `[${createMockEmbedding(1).join(',')}]`,
      },
      {
        pointValue: 3,
        title: 'Medium Story / Standard Feature',
        description: 'Clear business logic change touching a single service boundary with standard unit tests.',
        criteria: JSON.stringify(['Clear acceptance criteria', 'Standard test coverage']),
        embedding: `[${createMockEmbedding(3).join(',')}]`,
      },
      {
        pointValue: 5,
        title: 'Large Story / Complex Flow',
        description: 'Multi-step workflow, database schema alteration, or cross-component state management.',
        criteria: JSON.stringify(['Database migration required', 'Multiple UX states']),
        embedding: `[${createMockEmbedding(5).join(',')}]`,
      },
      {
        pointValue: 8,
        title: 'Extra Large Story / Needs Slicing',
        description: 'Architectural change or third-party integration requiring SPIDR vertical decomposition.',
        criteria: JSON.stringify(['External API dependency', 'Spike recommendation']),
        embedding: `[${createMockEmbedding(8).join(',')}]`,
      },
    ];

    for (const b of benchmarks) {
      await queryClient`
        INSERT INTO point_reference_benchmarks (point_value, title, description, acceptance_criteria, embedding, is_global_default)
        VALUES (${b.pointValue}, ${b.title}, ${b.description}, ${b.criteria}::jsonb, ${b.embedding}::vector, true)
        ON CONFLICT DO NOTHING;
      `;
    }

    console.log('✅ Database benchmarks seeded successfully.');
  } catch (err) {
    console.error('Seeding error:', err);
    throw err;
  } finally {
    await queryClient.end();
  }
}

if (process.env.NODE_ENV !== 'test') {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
