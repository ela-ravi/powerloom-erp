import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import { notifyAsync, notifyOwners } from "../../shared/notify.js";

interface WageCycleRow {
  id: string;
  tenant_id: string;
  cycle_number: number;
  cycle_start_date: string;
  cycle_end_date: string;
  status: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

interface WageRecordRow {
  id: string;
  tenant_id: string;
  wage_cycle_id: string;
  worker_id: string;
  worker_type: string;
  gross_wage: string;
  advance_deduction: string;
  damage_deduction: string;
  net_payable: string;
  discretionary_amount: string;
  actual_paid: string;
  created_at: Date;
  updated_at: Date;
}

function cycleToResponse(row: WageCycleRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    cycleNumber: row.cycle_number,
    cycleStartDate: row.cycle_start_date,
    cycleEndDate: row.cycle_end_date,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function recordToResponse(row: WageRecordRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    wageCycleId: row.wage_cycle_id,
    workerId: row.worker_id,
    workerType: row.worker_type,
    grossWage: parseFloat(row.gross_wage),
    advanceDeduction: parseFloat(row.advance_deduction),
    damageDeduction: parseFloat(row.damage_deduction),
    netPayable: parseFloat(row.net_payable),
    discretionaryAmount: parseFloat(row.discretionary_amount),
    actualPaid: parseFloat(row.actual_paid),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["review"],
  review: ["approved"],
  approved: ["paid"],
  paid: [],
};

// postgres.js TransactionSql loses call signatures due to Omit<> in TS.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxSql = any;

export class WageCycleService {
  async generate(
    tenantId: string,
    createdBy: string,
    data: {
      cycleStartDate: string;
      cycleEndDate: string;
      advanceDeductionAmount?: number;
    },
  ) {
    // Wrap entire generation in a single transaction for atomicity
    return await sql.begin(async (tx: TxSql) => {
      // Get next cycle number (safe inside transaction)
      const lastCycle = await tx<{ max_num: number | null }[]>`
        SELECT MAX(cycle_number) as max_num FROM wage_cycles WHERE tenant_id = ${tenantId}
      `;
      const cycleNumber = (lastCycle[0].max_num ?? 0) + 1;

      // Create the wage cycle with explicit draft status
      const cycle = await tx<WageCycleRow[]>`
        INSERT INTO wage_cycles (tenant_id, cycle_number, cycle_start_date, cycle_end_date, status, created_by)
        VALUES (${tenantId}, ${cycleNumber}, ${data.cycleStartDate}, ${data.cycleEndDate}, 'draft', ${createdBy})
        RETURNING *
      `;

      const cycleId = cycle[0].id;
      const advDeduction = data.advanceDeductionAmount ?? 0;

      // Check if shift-based wage rates are enabled for this tenant
      const settingsResult = await tx<{ shift_enabled: boolean }[]>`
        SELECT shift_enabled FROM tenant_settings WHERE tenant_id = ${tenantId}
      `;
      const shiftEnabled =
        settingsResult.length > 0 && settingsResult[0].shift_enabled;

      // Generate wage records for all active wagers
      const wagers = await tx<
        { user_id: string; wager_type: number; id: string }[]
      >`
        SELECT wp.user_id, wp.wager_type, wp.id
        FROM wager_profiles wp
        WHERE wp.tenant_id = ${tenantId} AND wp.is_active = true
      `;

      for (const wager of wagers) {
        let grossWage = 0;

        if (wager.wager_type === 1 || wager.wager_type === 3) {
          // Type 1/3: wage per kg — use shift rates when shift_enabled
          const production = shiftEnabled
            ? await tx<{ total: string }[]>`
                SELECT COALESCE(SUM(pr.weight_kg * COALESCE(swr.wage_rate_per_kg, p.wage_rate_per_kg)), 0) as total
                FROM production_returns pr
                JOIN products p ON p.id = pr.product_id AND p.tenant_id = ${tenantId}
                LEFT JOIN shifts s ON s.id = pr.shift_id AND s.tenant_id = ${tenantId}
                LEFT JOIN shift_wage_rates swr ON swr.product_id = pr.product_id AND swr.shift = s.shift_type AND swr.tenant_id = ${tenantId}
                WHERE pr.tenant_id = ${tenantId}
                  AND pr.wager_id = ${wager.user_id}
                  AND pr.return_date >= ${data.cycleStartDate}
                  AND pr.return_date <= ${data.cycleEndDate}
              `
            : await tx<{ total: string }[]>`
                SELECT COALESCE(SUM(pr.weight_kg * p.wage_rate_per_kg), 0) as total
                FROM production_returns pr
                JOIN products p ON p.id = pr.product_id AND p.tenant_id = ${tenantId}
                WHERE pr.tenant_id = ${tenantId}
                  AND pr.wager_id = ${wager.user_id}
                  AND pr.return_date >= ${data.cycleStartDate}
                  AND pr.return_date <= ${data.cycleEndDate}
              `;
          grossWage = parseFloat(production[0].total);
        } else {
          // Type 2/4: wage per piece — use shift rates when shift_enabled
          const production = shiftEnabled
            ? await tx<{ total: string }[]>`
                SELECT COALESCE(SUM(pr.piece_count * COALESCE(swr.wage_rate_per_piece, p.wage_rate_per_piece)), 0) as total
                FROM production_returns pr
                JOIN products p ON p.id = pr.product_id AND p.tenant_id = ${tenantId}
                LEFT JOIN shifts s ON s.id = pr.shift_id AND s.tenant_id = ${tenantId}
                LEFT JOIN shift_wage_rates swr ON swr.product_id = pr.product_id AND swr.shift = s.shift_type AND swr.tenant_id = ${tenantId}
                WHERE pr.tenant_id = ${tenantId}
                  AND pr.wager_id = ${wager.user_id}
                  AND pr.return_date >= ${data.cycleStartDate}
                  AND pr.return_date <= ${data.cycleEndDate}
              `
            : await tx<{ total: string }[]>`
                SELECT COALESCE(SUM(pr.piece_count * p.wage_rate_per_piece), 0) as total
                FROM production_returns pr
                JOIN products p ON p.id = pr.product_id AND p.tenant_id = ${tenantId}
                WHERE pr.tenant_id = ${tenantId}
                  AND pr.wager_id = ${wager.user_id}
                  AND pr.return_date >= ${data.cycleStartDate}
                  AND pr.return_date <= ${data.cycleEndDate}
              `;
          grossWage = parseFloat(production[0].total);
        }

        // Damage deduction: sum of APPROVED damages using approved_at (not created_at)
        const damage = await tx<{ total: string }[]>`
          SELECT COALESCE(SUM(total_deduction), 0) as total
          FROM damage_records
          WHERE tenant_id = ${tenantId}
            AND wager_id = ${wager.user_id}
            AND approval_status = 'approved'
            AND approved_at >= ${data.cycleStartDate}::date
            AND approved_at < ${data.cycleEndDate}::date + interval '1 day'
        `;
        const damageDeduction = parseFloat(damage[0].total);

        const netPayable = grossWage - advDeduction - damageDeduction;

        await tx`
          INSERT INTO wage_records (tenant_id, wage_cycle_id, worker_id, worker_type, gross_wage, advance_deduction, damage_deduction, net_payable)
          VALUES (${tenantId}, ${cycleId}, ${wager.user_id}, 'wager', ${grossWage}, ${advDeduction}, ${damageDeduction}, ${netPayable})
        `;
      }

      // Generate wage records for active tailors
      const tailors = await tx<{ id: string }[]>`
        SELECT id FROM users WHERE tenant_id = ${tenantId} AND role = 'tailor' AND is_active = true
      `;

      for (const tailor of tailors) {
        const tailorWage = await tx<{ total: string }[]>`
          SELECT COALESCE(SUM(total_wage), 0) as total
          FROM tailoring_records
          WHERE tenant_id = ${tenantId}
            AND tailor_id = ${tailor.id}
            AND work_date >= ${data.cycleStartDate}
            AND work_date <= ${data.cycleEndDate}
        `;
        const grossWage = parseFloat(tailorWage[0].total);
        const netPayable = grossWage;

        await tx`
          INSERT INTO wage_records (tenant_id, wage_cycle_id, worker_id, worker_type, gross_wage, advance_deduction, damage_deduction, net_payable)
          VALUES (${tenantId}, ${cycleId}, ${tailor.id}, 'tailor', ${grossWage}, 0, 0, ${netPayable})
        `;
      }

      // Generate wage records for active packagers
      const packagers = await tx<{ id: string }[]>`
        SELECT id FROM users WHERE tenant_id = ${tenantId} AND role = 'packager' AND is_active = true
      `;

      for (const packager of packagers) {
        const packagerWage = await tx<{ total: string }[]>`
          SELECT COALESCE(SUM(total_wage), 0) as total
          FROM packaging_records
          WHERE tenant_id = ${tenantId}
            AND packager_id = ${packager.id}
            AND work_date >= ${data.cycleStartDate}
            AND work_date <= ${data.cycleEndDate}
        `;
        const grossWage = parseFloat(packagerWage[0].total);
        const netPayable = grossWage;

        await tx`
          INSERT INTO wage_records (tenant_id, wage_cycle_id, worker_id, worker_type, gross_wage, advance_deduction, damage_deduction, net_payable)
          VALUES (${tenantId}, ${cycleId}, ${packager.id}, 'packager', ${grossWage}, 0, 0, ${netPayable})
        `;
      }

      // Generate wage records for Paavu Oati workers
      const rateResult = await tx<{ rate_per_paavu: string }[]>`
        SELECT rate_per_paavu FROM tenant_settings WHERE tenant_id = ${tenantId}
      `;
      const ratePerPaavu =
        rateResult.length > 0 ? parseFloat(rateResult[0].rate_per_paavu) : 0;

      if (ratePerPaavu > 0) {
        // Find distinct paavu_oati workers who produced in this period
        const paavuWorkers = await tx<
          { paavu_oati_id: string; total_paavu: string }[]
        >`
          SELECT paavu_oati_id, SUM(paavu_count) as total_paavu
          FROM paavu_productions
          WHERE tenant_id = ${tenantId}
            AND production_date >= ${data.cycleStartDate}
            AND production_date <= ${data.cycleEndDate}
          GROUP BY paavu_oati_id
        `;

        for (const worker of paavuWorkers) {
          const grossWage =
            Math.round(parseFloat(worker.total_paavu) * ratePerPaavu * 100) /
            100;
          const netPayable = grossWage;

          await tx`
            INSERT INTO wage_records (tenant_id, wage_cycle_id, worker_id, worker_type, gross_wage, advance_deduction, damage_deduction, net_payable)
            VALUES (${tenantId}, ${cycleId}, ${worker.paavu_oati_id}, 'paavu_oati', ${grossWage}, 0, 0, ${netPayable})
          `;
        }
      }

      // Fetch created records
      const records = await tx<WageRecordRow[]>`
        SELECT * FROM wage_records WHERE wage_cycle_id = ${cycleId} AND tenant_id = ${tenantId}
        ORDER BY worker_type, worker_id
      `;

      return {
        ...cycleToResponse(cycle[0]),
        wageRecords: records.map(recordToResponse),
      };
    });
  }

  async findAll(
    tenantId: string,
    query: { limit?: number; offset?: number; status?: string } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM wage_cycles
      WHERE tenant_id = ${tenantId}
      ${query.status ? sql`AND status = ${query.status}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<WageCycleRow[]>`
      SELECT * FROM wage_cycles
      WHERE tenant_id = ${tenantId}
      ${query.status ? sql`AND status = ${query.status}` : sql``}
      ORDER BY cycle_number DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(cycleToResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(tenantId: string, id: string) {
    const cycle = await sql<WageCycleRow[]>`
      SELECT * FROM wage_cycles WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (cycle.length === 0) {
      throw AppError.notFound("Wage cycle not found");
    }

    const records = await sql<WageRecordRow[]>`
      SELECT * FROM wage_records WHERE wage_cycle_id = ${id} AND tenant_id = ${tenantId}
      ORDER BY worker_type, worker_id
    `;

    return {
      ...cycleToResponse(cycle[0]),
      wageRecords: records.map(recordToResponse),
    };
  }

  async transition(tenantId: string, id: string, newStatus: string) {
    // Use atomic check-and-set to prevent TOCTOU race
    return await sql.begin(async (tx: TxSql) => {
      const cycle = await tx<WageCycleRow[]>`
        SELECT * FROM wage_cycles WHERE id = ${id} AND tenant_id = ${tenantId} FOR UPDATE
      `;
      if (cycle.length === 0) {
        throw AppError.notFound("Wage cycle not found");
      }

      const validNext = VALID_TRANSITIONS[cycle[0].status] ?? [];
      if (!validNext.includes(newStatus)) {
        throw AppError.validation(
          `Cannot transition from '${cycle[0].status}' to '${newStatus}'`,
        );
      }

      const result = await tx<WageCycleRow[]>`
        UPDATE wage_cycles SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `;

      // If transitioning to paid: set actual_paid and update advance balances
      if (newStatus === "paid") {
        // actual_paid = GREATEST(net_payable, 0) + discretionary_amount
        await tx`
          UPDATE wage_records SET
            actual_paid = GREATEST(net_payable, 0) + discretionary_amount,
            updated_at = NOW()
          WHERE wage_cycle_id = ${id} AND tenant_id = ${tenantId}
        `;

        // For wagers: deduct advance_deduction from advance_balance and record transactions
        const wagerRecords = await tx<
          {
            id: string;
            worker_id: string;
            advance_deduction: string;
            discretionary_amount: string;
          }[]
        >`
          SELECT id, worker_id, advance_deduction, discretionary_amount
          FROM wage_records
          WHERE wage_cycle_id = ${id} AND tenant_id = ${tenantId}
            AND worker_type = 'wager'
            AND (advance_deduction > 0 OR discretionary_amount > 0)
        `;

        for (const wr of wagerRecords) {
          const advDed = parseFloat(wr.advance_deduction);
          const discretionary = parseFloat(wr.discretionary_amount);

          // Find the wager_profiles.id for this user
          const wp = await tx<{ id: string; advance_balance: string }[]>`
            SELECT id, advance_balance FROM wager_profiles
            WHERE user_id = ${wr.worker_id} AND tenant_id = ${tenantId}
            FOR UPDATE
          `;
          if (wp.length === 0) continue;

          let currentBalance = parseFloat(wp[0].advance_balance);

          // Deduct advance from balance
          if (advDed > 0) {
            currentBalance = Math.round((currentBalance - advDed) * 100) / 100;
            await tx`
              UPDATE wager_profiles SET
                advance_balance = ${currentBalance},
                updated_at = NOW()
              WHERE id = ${wp[0].id} AND tenant_id = ${tenantId}
            `;
            await tx`
              INSERT INTO advance_transactions (tenant_id, wager_id, type, amount, balance_after, reference_id, notes, created_by)
              VALUES (${tenantId}, ${wp[0].id}, 'advance_deduction', ${advDed}, ${currentBalance}, ${id}, 'Wage cycle deduction', ${cycle[0].created_by})
            `;
          }

          // Add discretionary to advance balance
          if (discretionary > 0) {
            currentBalance =
              Math.round((currentBalance + discretionary) * 100) / 100;
            await tx`
              UPDATE wager_profiles SET
                advance_balance = ${currentBalance},
                additional_advances = additional_advances + ${discretionary},
                updated_at = NOW()
              WHERE id = ${wp[0].id} AND tenant_id = ${tenantId}
            `;
            await tx`
              INSERT INTO advance_transactions (tenant_id, wager_id, type, amount, balance_after, reference_id, notes, created_by)
              VALUES (${tenantId}, ${wp[0].id}, 'discretionary_addition', ${discretionary}, ${currentBalance}, ${id}, 'Discretionary payment added to advance', ${cycle[0].created_by})
            `;
          }
        }
      }

      // Notify: wage cycle paid
      if (newStatus === "paid") {
        // Notify all workers in this cycle
        const allWorkers = await tx<{ worker_id: string }[]>`
          SELECT DISTINCT worker_id FROM wage_records
          WHERE wage_cycle_id = ${id} AND tenant_id = ${tenantId}
        `;
        for (const w of allWorkers) {
          notifyAsync(tenantId, {
            userId: w.worker_id,
            eventType: "wage_cycle_paid",
            title: "Wages Paid",
            message: `Wage cycle #${result[0].cycle_number} has been paid. Check your wage record for details.`,
            priority: "high",
            referenceType: "wage_cycle",
            referenceId: id,
          });
        }
      }

      return cycleToResponse(result[0]);
    });
  }

  async setDiscretionary(
    tenantId: string,
    wageRecordId: string,
    amount: number,
  ) {
    const record = await sql<(WageRecordRow & { status: string })[]>`
      SELECT wr.*, wc.status FROM wage_records wr
      JOIN wage_cycles wc ON wc.id = wr.wage_cycle_id
      WHERE wr.id = ${wageRecordId} AND wr.tenant_id = ${tenantId}
    `;
    if (record.length === 0) {
      throw AppError.notFound("Wage record not found");
    }

    // Guard: cannot modify paid cycle records
    if (record[0].status === "paid") {
      throw AppError.validation("Cannot modify wage records in a paid cycle");
    }

    // Guard: discretionary only for zero/negative net payable
    if (parseFloat(record[0].net_payable) > 0) {
      throw AppError.validation(
        "Discretionary payment only applies when net payable is zero or negative",
      );
    }

    const result = await sql<WageRecordRow[]>`
      UPDATE wage_records SET
        discretionary_amount = ${amount},
        updated_at = NOW()
      WHERE id = ${wageRecordId} AND tenant_id = ${tenantId}
      RETURNING *
    `;

    return recordToResponse(result[0]);
  }

  async getWorkerWages(
    tenantId: string,
    workerId: string,
    query: { limit?: number; offset?: number } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM wage_records
      WHERE tenant_id = ${tenantId} AND worker_id = ${workerId}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<WageRecordRow[]>`
      SELECT * FROM wage_records
      WHERE tenant_id = ${tenantId} AND worker_id = ${workerId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(recordToResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }
}
