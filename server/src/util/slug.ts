const ADJECTIVES = [
  'swift', 'bright', 'calm', 'daring', 'eager', 'fierce', 'gentle', 'happy',
  'jolly', 'keen', 'lively', 'merry', 'noble', 'proud', 'quick', 'rare',
  'silent', 'tough', 'vivid', 'warm', 'zen', 'brave', 'clever', 'grand',
];

const ANIMALS = [
  'badger', 'falcon', 'otter', 'panda', 'tiger', 'wolf', 'bear', 'dolphin',
  'eagle', 'fox', 'hawk', 'koala', 'lion', 'owl', 'rabbit', 'seal',
  'cheetah', 'lynx', 'panther', 'viper', 'bison', 'puma', 'cobra', 'jaguar',
];

export interface GeneratedRoomCode {
  slug: string;
  shortCode: string;
}

export function generateRoomSlug(): GeneratedRoomCode {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(10 + Math.random() * 90);

  const slug = `${adj}-${animal}-${num}`;
  const shortCode = `${adj.slice(0, 2).toUpperCase()}${animal.slice(0, 1).toUpperCase()}-${num}`;

  return { slug, shortCode };
}
