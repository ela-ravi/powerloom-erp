import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { notifyAsync } from "../../shared/notify.js";

interface AdvanceTransactionRow {
  id: string;
  tenant_id: string;
  wager_id: string;
  type: string;
  amount: string;
  balance_after: string;
  reference_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: Date;
}

function toResponse(row: AdvanceTransactionRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    wagerId: row.wager_id,
    type: row.type,
    amount: parseFloat(row.amount),
    balanceAfter: parseFloat(row.balance_after),
    referenceId: row.reference_id,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// postgres.js TransactionSql loses call signatures due to Omit<> in TS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxSql = any;

export class AdvanceService {
  async issueAdvance(
    tenantId: string,
    createdBy: string,
    data: { wagerId: string; amount: number; notes?: string },
  ) {
    // Wrap in transaction to prevent lost-update race on advance_balance
    return await sql.begin(async (tx: TxSql) => {
      // Lock the wager profile row to prevent concurrent updates
      const wager = await tx<
        {
          id: string;
          user_id: string;
          advance_balance: string;
          original_advance: string;
        }[]
      >`
        SELECT id, user_id, advance_balance, original_advance
        FROM wager_profiles WHERE id = ${data.wagerId} AND tenant_id = ${tenantId}
        FOR UPDATE
      `;
      if (wager.length === 0) {
        throw AppError.notFound("Wager profile not found");
      }

      // Use atomic SQL addition to prevent lost updates
      await tx`
        UPDATE wager_profiles SET
          advance_balance = advance_balance + ${data.amount},
          additional_advances = additional_advances + ${data.amount},
          updated_at = NOW()
        WHERE id = ${data.wagerId} AND tenant_id = ${tenantId}
      `;

      const newBalance = parseFloat(wager[0].advance_balance) + data.amount;

      // Create advance transaction
      const result = await tx<AdvanceTransactionRow[]>`
        INSERT INTO advance_transactions (tenant_id, wager_id, type, amount, balance_after, notes, created_by)
        VALUES (${tenantId}, ${data.wagerId}, 'advance_given', ${data.amount}, ${newBalance}, ${data.notes ?? null}, ${createdBy})
        RETURNING *
      `;

      // Notify the wager about advance issued
      notifyAsync(tenantId, {
        userId: wager[0].user_id,
        eventType: "advance_given",
        title: "Advance Issued",
        message: `An advance of ₹${data.amount} has been issued. New balance: ₹${newBalance}.`,
        priority: "medium",
        referenceType: "advance_transaction",
        referenceId: result[0].id,
      });

      return toResponse(result[0]);
    });
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      wagerId?: string;
      type?: string;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM advance_transactions
      WHERE tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND wager_id = ${query.wagerId}` : sql``}
      ${query.type ? sql`AND type = ${query.type}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<AdvanceTransactionRow[]>`
      SELECT * FROM advance_transactions
      WHERE tenant_id = ${tenantId}
      ${query.wagerId ? sql`AND wager_id = ${query.wagerId}` : sql``}
      ${query.type ? sql`AND type = ${query.type}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async getBalance(tenantId: string, wagerId: string) {
    const wager = await sql<
      {
        id: string;
        advance_balance: string;
        original_advance: string;
        additional_advances: string;
      }[]
    >`
      SELECT id, advance_balance, original_advance, additional_advances
      FROM wager_profiles WHERE id = ${wagerId} AND tenant_id = ${tenantId}
    `;
    if (wager.length === 0) {
      throw AppError.notFound("Wager profile not found");
    }

    return {
      wagerId: wager[0].id,
      advanceBalance: parseFloat(wager[0].advance_balance),
      originalAdvance: parseFloat(wager[0].original_advance),
      additionalAdvances: parseFloat(wager[0].additional_advances),
    };
  }
}
