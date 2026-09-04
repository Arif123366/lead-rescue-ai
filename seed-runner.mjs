import { seedDatabase } from './lib/db/seed.ts';

try {
  seedDatabase();
  console.log('Seed runner finished successfully!');
} catch (err) {
  console.error('Seed runner error:', err);
}
