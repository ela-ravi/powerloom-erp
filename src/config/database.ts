import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env.js";

const connectionString =
  env.NODE_ENV === "test"
    ? env.DATABASE_URL_TEST || env.DATABASE_URL
    : env.DATABASE_URL;

const queryClient = postgres(connectionString, {
  max: env.NODE_ENV === "test" ? 5 : 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient);
export const sql = queryClient;

export async function closeDatabase(): Promise<void> {
  await queryClient.end();
}
