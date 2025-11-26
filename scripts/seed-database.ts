import { assertPrisma } from "../server/db";

const prisma = assertPrisma();

async function seedDatabase() {
  console.log("Seed script placeholder. Add Prisma createMany calls as needed.");
  await prisma.$disconnect();
}

seedDatabase().catch(async (err) => {
  console.error("Seed failed", err);
  await prisma.$disconnect();
  process.exit(1);
});
