import { requireAuth, clerkMiddleware } from "@clerk/express";
import type { Express } from "express";
import { storage } from "./storage";

export async function setupAuth(app: Express) {
  // Clerk middleware - handles authentication for all routes
  app.use(clerkMiddleware());

  // Auth status endpoint - check if user is logged in
  app.get("/api/auth/status", async (req: any, res) => {
    try {
      const userId = req.auth?.userId;
      
      if (!userId) {
        res.json({ authenticated: false, user: null });
        return;
      }

      // Check if user exists in our database
      const user = await storage.getUser(userId);
      
      if (!user) {
        res.json({ authenticated: false, user: null });
        return;
      }

      res.json({ authenticated: true, user });
    } catch (error) {
      console.error("Error fetching auth status:", error);
      res.json({ authenticated: false, user: null });
    }
  });

  // Auth user endpoint - get current logged-in user (protected)
  app.get("/api/auth/user", requireAuth(), async (req: any, res) => {
    try {
      const userId = req.auth?.userId;
      
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await storage.getUser(userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (!req.auth?.userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

// Middleware to check if user is admin
export async function isAdmin(req: any, res: any, next: any) {
  try {
    const userId = req.auth?.userId;
    
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await storage.getUser(userId);
    
    if (!user?.isAdmin) {
      res.status(403).json({ message: "Forbidden - admin access required" });
      return;
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Failed to verify admin status" });
  }
}
