import { sql as drizzleSql, eq, and, SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db, sql } from "../config/database.js";
import type { PaginationQuery, PaginatedResponse } from "../types/api.js";

export class BaseRepository<T extends Record<string, unknown>> {
  constructor(
    protected readonly tableName: string,
    protected readonly columns: string[] = ["*"],
  ) {}

  protected async setTenantContext(tenantId: string): Promise<void> {
    await sql`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
  }

  async findById(id: string, tenantId: string): Promise<T | null> {
    await this.setTenantContext(tenantId);
    const result = await sql<T[]>`
      SELECT * FROM ${sql(this.tableName)}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      LIMIT 1
    `;
    return result[0] ?? null;
  }

  async findAll(
    tenantId: string,
    pagination: PaginationQuery = {},
    filters: SQL[] = [],
  ): Promise<PaginatedResponse<T>> {
    await this.setTenantContext(tenantId);
    const limit = pagination.limit ?? 20;
    const offset = pagination.offset ?? 0;
    const sortBy = pagination.sortBy ?? "created_at";
    const sortOrder = pagination.sortOrder ?? "desc";

    const whereClause = `tenant_id = '${tenantId}'${filters.length > 0 ? " AND " : ""}`;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM ${sql(this.tableName)}
      WHERE tenant_id = ${tenantId}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<T[]>`
      SELECT * FROM ${sql(this.tableName)}
      WHERE tenant_id = ${tenantId}
      ORDER BY ${sql(sortBy)} ${sql(sortOrder === "asc" ? "ASC" : "DESC")}
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async create(data: Partial<T> & { tenant_id: string }): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const columnNames = keys.join(", ");

    const result = await sql<T[]>`
      INSERT INTO ${sql(this.tableName)} (${sql(columnNames)})
      VALUES (${sql.unsafe(placeholders, values as any)})
      RETURNING *
    `;
    return result[0];
  }

  async update(
    id: string,
    tenantId: string,
    data: Partial<T>,
  ): Promise<T | null> {
    await this.setTenantContext(tenantId);
    const keys = Object.keys(data);
    if (keys.length === 0) return this.findById(id, tenantId);

    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
    const values = Object.values(data);

    const result = await sql<T[]>`
      UPDATE ${sql(this.tableName)}
      SET ${sql.unsafe(setClauses, values as any)}, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return result[0] ?? null;
  }

  async softDelete(id: string, tenantId: string): Promise<boolean> {
    await this.setTenantContext(tenantId);
    const result = await sql`
      UPDATE ${sql(this.tableName)}
      SET is_active = false, updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING id
    `;
    return result.length > 0;
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    const result = await sql<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM ${sql(this.tableName)}
        WHERE id = ${id} AND tenant_id = ${tenantId}
      ) as exists
    `;
    return result[0].exists;
  }
}
