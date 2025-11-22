#!/usr/bin/env tsx
/**
 * Admin Bootstrap Script
 * 
 * Run this script to promote a user to admin by their email address.
 * Usage: npm run make-admin <email>
 * 
 * Example: npm run make-admin user@example.com
 */

import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function makeAdmin(email: string) {
  if (!email) {
    console.error('❌ Error: Email address required');
    console.log('Usage: npm run make-admin <email>');
    process.exit(1);
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      console.error(`❌ Error: No user found with email: ${email}`);
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`✓ User ${email} is already an admin`);
      process.exit(0);
    }

    await db
      .update(users)
      .set({ isAdmin: true, updatedAt: new Date() })
      .where(eq(users.email, email));

    console.log(`✓ Success: ${email} is now an admin`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error);
    process.exit(1);
  }
}

const email = process.argv[2];
makeAdmin(email);
