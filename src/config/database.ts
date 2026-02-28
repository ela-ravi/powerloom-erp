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

/**
 * Module augmentation for postgres.js TransactionSql.
 *
 * TypeScript's `Omit` (used internally by the `TransactionSql` definition)
 * strips call signatures from the `Sql` interface.  We re-add them here so
 * that tagged-template usage like `tx\`SELECT ...\`` compiles correctly
 * inside `sql.begin()` callbacks.
 */
declare module "postgres" {
  interface TransactionSql<TTypes extends Record<string, unknown> = {}> {
    <T, K extends readonly any[]>(first: T, ...rest: K): any;
    <T extends readonly (object | undefined)[]>(
      template: TemplateStringsArray,
      ...parameters: readonly postgres.ParameterOrFragment<TTypes[keyof TTypes]>[]
    ): postgres.PendingQuery<T>;
  }
}

export async function closeDatabase(): Promise<void> {
  await queryClient.end();
}
