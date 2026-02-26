import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { notifyOwners } from "../../shared/notify.js";

interface BatchRow {
  id: string;
  tenant_id: string;
  batch_number: string;
  product_id: string;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function toResponse(row: BatchRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    batchNumber: row.batch_number,
    productId: row.product_id,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress"],
  in_progress: ["closed"],
  closed: ["open"], // reopen capability
};

export class BatchService {
  async requireBatchEnabled(tenantId: string) {
    const settings = await sql<{ batch_enabled: boolean }[]>`
      SELECT batch_enabled FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;
    if (settings.length === 0 || !settings[0].batch_enabled) {
      throw AppError.forbidden("Batch system is not enabled for this tenant");
    }
  }

  private async generateBatchNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const dateStr =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const prefix = `B-${dateStr}-`;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM batches
      WHERE tenant_id = ${tenantId} AND batch_number LIKE ${prefix + "%"}
    `;
    const count = parseInt(countResult[0].count, 10);
    return `${prefix}${String(count + 1).padStart(3, "0")}`;
  }

  async create(tenantId: string, data: { productId: string; notes?: string }) {
    await this.requireBatchEnabled(tenantId);

    // Verify product exists
    const product = await sql`
      SELECT id FROM products WHERE id = ${data.productId} AND tenant_id = ${tenantId}
    `;
    if (product.length === 0) {
      throw AppError.validation("Product not found");
    }

    const batchNumber = await this.generateBatchNumber(tenantId);

    const result = await sql<BatchRow[]>`
      INSERT INTO batches (tenant_id, batch_number, product_id, notes)
      VALUES (${tenantId}, ${batchNumber}, ${data.productId}, ${data.notes ?? null})
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      status?: string;
      productId?: string;
    } = {},
  ) {
    await this.requireBatchEnabled(tenantId);

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM batches
      WHERE tenant_id = ${tenantId}
      ${query.status ? sql`AND status = ${query.status}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<BatchRow[]>`
      SELECT * FROM batches
      WHERE tenant_id = ${tenantId}
      ${query.status ? sql`AND status = ${query.status}` : sql``}
      ${query.productId ? sql`AND product_id = ${query.productId}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async update(
    tenantId: string,
    id: string,
    data: Partial<{ productId: string; notes: string | null }>,
  ) {
    await this.requireBatchEnabled(tenantId);

    const existing = await sql<BatchRow[]>`
      SELECT * FROM batches WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Batch not found");
    }

    if (data.productId) {
      const product = await sql`
        SELECT id FROM products WHERE id = ${data.productId} AND tenant_id = ${tenantId}
      `;
      if (product.length === 0) {
        throw AppError.validation("Product not found");
      }
    }

    const result = await sql<BatchRow[]>`
      UPDATE batches SET
        product_id = COALESCE(${data.productId ?? null}, product_id),
        notes = ${data.notes !== undefined ? data.notes : existing[0].notes},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toResponse(result[0]);
  }

  async updateStatus(tenantId: string, id: string, newStatus: string) {
    await this.requireBatchEnabled(tenantId);

    const existing = await sql<BatchRow[]>`
      SELECT * FROM batches WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Batch not found");
    }

    const currentStatus = existing[0].status;
    const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(newStatus)) {
      throw AppError.validation(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
      );
    }

    const result = await sql<BatchRow[]>`
      UPDATE batches SET
        status = ${newStatus},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    // Notify owners when batch is closed
    if (newStatus === "closed") {
      notifyOwners(tenantId, {
        eventType: "batch_closed",
        title: "Batch Closed",
        message: `Batch ${result[0].batch_number} has been closed.`,
        priority: "low",
        referenceType: "batch",
        referenceId: id,
      });
    }

    return toResponse(result[0]);
  }
}
