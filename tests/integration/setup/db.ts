import postgres from "postgres";
import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "../../..");

export function createTestDb() {
  const connectionString =
    process.env.DATABASE_URL_TEST ||
    "postgres://powerloom:powerloom@localhost:5433/powerloom_erp_test";
  return postgres(connectionString, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export async function resetDatabase(sql: postgres.Sql) {
  // Drop and recreate schema
  await sql.unsafe(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    GRANT ALL ON SCHEMA public TO powerloom;
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);

  // Run all migrations in order
  const migrationsDir = resolve(PROJECT_ROOT, "migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sqlContent = readFileSync(resolve(migrationsDir, file), "utf-8");
    await sql.unsafe(sqlContent);
  }

  // Run all seeds in order
  const seedsDir = resolve(PROJECT_ROOT, "seeds");
  const seedFiles = readdirSync(seedsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of seedFiles) {
    const sqlContent = readFileSync(resolve(seedsDir, file), "utf-8");
    await sql.unsafe(sqlContent);
  }
}

export async function closeTestDb(sql: postgres.Sql) {
  await sql.end();
}
