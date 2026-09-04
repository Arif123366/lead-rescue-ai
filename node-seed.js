const { seedDatabase } = require('./lib/db/seed.ts');
console.log('Seeding...');
try {
  seedDatabase();
  console.log('Done!');
} catch (e) {
  console.error(e);
}
