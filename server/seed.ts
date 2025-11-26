import { assertPrisma, hasDatabaseUrl } from "./db";

if (!hasDatabaseUrl) {
  console.error("DATABASE_URL must be set to seed the database. Aborting.");
  process.exit(1);
}

const prisma = assertPrisma();

async function seed() {
  console.log("Prisma seed placeholder - add seed data as needed");
  await prisma.$disconnect();
}

seed().catch(async (err) => {
  console.error("Seeding failed", err);
  await prisma.$disconnect();
  process.exit(1);
});
