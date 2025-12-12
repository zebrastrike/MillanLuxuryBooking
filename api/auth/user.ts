import { clerkClient, getAuth } from "@clerk/clerk-sdk-node";
import { isAdminUser } from "../../shared/auth";
import { assertPrisma, hasDatabaseUrl } from "../../server/db/prismaClient";

const clerkEnabled = Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);
const nodeEnv = process.env.NODE_ENV ?? "development";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ message: "Method Not Allowed" });
    return;
  }

  if (!hasDatabaseUrl) {
    res.status(503).json({
      message: "Database connection is not configured. Set DATABASE_URL to enable API routes.",
    });
    return;
  }

  const prisma = assertPrisma();

  if (!clerkEnabled) {
    if (nodeEnv === "production") {
      res.status(503).json({ message: "Clerk configuration is required in production." });
      return;
    }

    res.json({
      id: "local-dev-admin",
      email: "local-admin@example.com",
      firstName: "Local",
      lastName: "Admin",
      profileImageUrl: null,
      isAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    let user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      const [clerkUser, existingCount] = await Promise.all([
        clerkClient.users.getUser(userId),
        prisma.user.count(),
      ]);

      let email: string | null = null;
      if (clerkUser.primaryEmailAddress?.emailAddress) {
        email = clerkUser.primaryEmailAddress.emailAddress;
      } else if (clerkUser.emailAddresses?.length) {
        const usableEmail = clerkUser.emailAddresses.find((address) => {
          const status = address.verification?.status as string | undefined;
          return address.emailAddress && status !== "revoked";
        });
        email = usableEmail?.emailAddress || null;
      }

      const isAdmin = isAdminUser(clerkUser) || existingCount === 0;

      user = await prisma.user.create({
        data: {
          id: userId,
          email,
          firstName: clerkUser.firstName || null,
          lastName: clerkUser.lastName || null,
          profileImageUrl: clerkUser.imageUrl || null,
          isAdmin,
        },
      });
    } else {
      const clerkUser = await clerkClient.users.getUser(userId);
      const shouldBeAdmin = isAdminUser(clerkUser) || Boolean(user.isAdmin);

      if (
        user.email !== clerkUser.primaryEmailAddress?.emailAddress ||
        user.firstName !== (clerkUser.firstName || null) ||
        user.lastName !== (clerkUser.lastName || null) ||
        user.profileImageUrl !== (clerkUser.imageUrl || null) ||
        user.isAdmin !== shouldBeAdmin
      ) {
        user = await prisma.user.update({
          where: { id: userId },
          data: {
            email: clerkUser.primaryEmailAddress?.emailAddress || user.email,
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null,
            profileImageUrl: clerkUser.imageUrl || null,
            isAdmin: shouldBeAdmin,
          },
        });
      }
    }

    res.json({
      ...user,
      id: String(user.id),
      createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
      updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
    });
  } catch (error) {
    console.error("Auth user lookup failed", error);
    res.status(500).json({ message: "Failed to retrieve user" });
  }
}
