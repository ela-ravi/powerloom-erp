import { sql } from "../config/database.js";

let savepointCounter = 0;

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  return sql.begin(async () => {
    return fn();
  }) as Promise<T>;
}

export async function withSavepoint<T>(fn: () => Promise<T>): Promise<T> {
  const name = `sp_${++savepointCounter}`;
  await sql`SAVEPOINT ${sql(name)}`;
  try {
    const result = await fn();
    await sql`RELEASE SAVEPOINT ${sql(name)}`;
    return result;
  } catch (error) {
    await sql`ROLLBACK TO SAVEPOINT ${sql(name)}`;
    throw error;
  }
}
