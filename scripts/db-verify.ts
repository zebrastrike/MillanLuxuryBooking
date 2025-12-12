import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set to run migrations and connectivity checks.");
}

console.log("Applying Prisma migrations to ensure the schema is up to date...");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("Verifying database connectivity with a lightweight query...");
const prisma = new PrismaClient();

await prisma.$queryRaw`SELECT 1`;
const userCount = await prisma.user.count();

console.log(`Database connection succeeded. Current users: ${userCount}.`);
await prisma.$disconnect();
