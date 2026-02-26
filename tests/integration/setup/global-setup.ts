import dotenv from "dotenv";
import { resolve } from "path";

// Load .env.test before anything else
dotenv.config({ path: resolve(import.meta.dirname, "../../../.env.test") });

import { createTestDb, resetDatabase, closeTestDb } from "./db.js";

export async function setup() {
  console.log("\n[integration] Resetting test database...");
  const sql = createTestDb();
  try {
    await resetDatabase(sql);
    console.log(
      "[integration] Database reset complete — migrations + seeds applied.",
    );
  } finally {
    await closeTestDb(sql);
  }
}

export async function teardown() {
  // Close the app's database connection to prevent process hang
  try {
    const { closeDatabase } = await import("../../../src/config/database.js");
    await closeDatabase();
  } catch {
    // Ignore — might not have been initialized
  }
}
