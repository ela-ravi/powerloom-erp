import { sql } from "../../config/database.js";

export class ReportService {
  // Production Reports
  async productionSummary(
    tenantId: string,
    query: {
      groupBy?: string;
      fromDate?: string;
      toDate?: string;
      productId?: string;
      batchId?: string;
    },
  ) {
    const groupBy = query.groupBy || "day";
    const dateExpr =
      groupBy === "day"
        ? sql`DATE(pr.created_at)`
        : groupBy === "week"
          ? sql`DATE_TRUNC('week', pr.created_at)::date`
          : sql`DATE_TRUNC('month', pr.created_at)::date`;

    const rows = await sql<
      {
        period: string;
        total_weight_kg: string;
        total_piece_count: string;
        return_count: string;
      }[]
    >`
      SELECT
        ${dateExpr} as period,
        COALESCE(SUM(pr.weight_kg), 0) as total_weight_kg,
        COALESCE(SUM(pr.piece_count), 0) as total_piece_count,
        COUNT(*) as return_count
      FROM production_returns pr
      WHERE pr.tenant_id = ${tenantId}
      ${query.fromDate ? sql`AND pr.created_at >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND pr.created_at <= ${query.toDate}` : sql``}
      ${query.productId ? sql`AND pr.product_id = ${query.productId}` : sql``}
      ${query.batchId ? sql`AND pr.batch_id = ${query.batchId}` : sql``}
      GROUP BY ${dateExpr}
      ORDER BY period DESC
    `;

    return rows.map((r) => ({
      period: r.period,
      totalWeightKg: parseFloat(r.total_weight_kg),
      totalPieceCount: parseInt(r.total_piece_count, 10),
      returnCount: parseInt(r.return_count, 10),
    }));
  }

  async batchProfitability(
    tenantId: string,
    query: { fromDate?: string; toDate?: string; batchId?: string },
  ) {
    const rows = await sql<
      {
        batch_id: string;
        batch_number: string;
        cone_cost: string;
        revenue: string;
        wage_cost: string;
      }[]
    >`
      SELECT
        b.id as batch_id,
        b.batch_number,
        COALESCE(SUM(DISTINCT cp.total_cost), 0) as cone_cost,
        COALESCE((
          SELECT SUM(ii.line_total) FROM invoice_items ii
          WHERE ii.batch_id = b.id AND ii.tenant_id = ${tenantId}
        ), 0) as revenue,
        COALESCE((
          SELECT SUM(wr.gross_wage) FROM wage_records wr
          JOIN wage_cycles wc ON wc.id = wr.wage_cycle_id
          WHERE wc.tenant_id = ${tenantId}
          ${query.fromDate ? sql`AND wc.cycle_start_date >= ${query.fromDate}` : sql``}
          ${query.toDate ? sql`AND wc.cycle_end_date <= ${query.toDate}` : sql``}
        ), 0) as wage_cost
      FROM batches b
      LEFT JOIN cone_purchases cp ON cp.batch_id = b.id AND cp.tenant_id = ${tenantId}
      WHERE b.tenant_id = ${tenantId}
      ${query.batchId ? sql`AND b.id = ${query.batchId}` : sql``}
      GROUP BY b.id, b.batch_number
      ORDER BY b.batch_number DESC
    `;

    return rows.map((r) => ({
      batchId: r.batch_id,
      batchNumber: r.batch_number,
      coneCost: parseFloat(r.cone_cost),
      revenue: parseFloat(r.revenue),
      wageCost: parseFloat(r.wage_cost),
      profit:
        parseFloat(r.revenue) -
        parseFloat(r.cone_cost) -
        parseFloat(r.wage_cost),
    }));
  }

  async colorProfitability(
    tenantId: string,
    query: { fromDate?: string; toDate?: string; batchId?: string },
  ) {
    const rows = await sql<
      { color: string; total_produced: string; total_revenue: string }[]
    >`
      SELECT
        pr.color,
        COALESCE(SUM(pr.piece_count), 0) as total_produced,
        COALESCE((
          SELECT SUM(ii.line_total) FROM invoice_items ii
          WHERE ii.color = pr.color AND ii.tenant_id = ${tenantId}
        ), 0) as total_revenue
      FROM production_returns pr
      WHERE pr.tenant_id = ${tenantId}
      ${query.fromDate ? sql`AND pr.created_at >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND pr.created_at <= ${query.toDate}` : sql``}
      ${query.batchId ? sql`AND pr.batch_id = ${query.batchId}` : sql``}
      GROUP BY pr.color
      ORDER BY total_revenue DESC
    `;

    return rows.map((r) => ({
      color: r.color,
      totalProduced: parseInt(r.total_produced, 10),
      totalRevenue: parseFloat(r.total_revenue),
    }));
  }

  async productProfitability(
    tenantId: string,
    query: { fromDate?: string; toDate?: string; batchId?: string },
  ) {
    const rows = await sql<
      {
        product_id: string;
        product_name: string;
        total_produced: string;
        total_revenue: string;
      }[]
    >`
      SELECT
        p.id as product_id,
        p.name as product_name,
        COALESCE(SUM(pr.piece_count), 0) as total_produced,
        COALESCE((
          SELECT SUM(ii.line_total) FROM invoice_items ii
          WHERE ii.product_id = p.id AND ii.tenant_id = ${tenantId}
        ), 0) as total_revenue
      FROM products p
      LEFT JOIN production_returns pr ON pr.product_id = p.id AND pr.tenant_id = ${tenantId}
        ${query.fromDate ? sql`AND pr.created_at >= ${query.fromDate}` : sql``}
        ${query.toDate ? sql`AND pr.created_at <= ${query.toDate}` : sql``}
        ${query.batchId ? sql`AND pr.batch_id = ${query.batchId}` : sql``}
      WHERE p.tenant_id = ${tenantId}
      GROUP BY p.id, p.name
      ORDER BY total_revenue DESC
    `;

    return rows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      totalProduced: parseInt(r.total_produced, 10),
      totalRevenue: parseFloat(r.total_revenue),
    }));
  }

  // Wager Reports
  async wageSheet(tenantId: string, cycleId: string) {
    const cycle = await sql<
      {
        id: string;
        cycle_number: number;
        cycle_start_date: string;
        cycle_end_date: string;
        status: string;
      }[]
    >`
      SELECT id, cycle_number, cycle_start_date, cycle_end_date, status
      FROM wage_cycles WHERE id = ${cycleId} AND tenant_id = ${tenantId}
    `;
    if (cycle.length === 0) {
      const { AppError } = await import("../../shared/errors.js");
      throw AppError.notFound("Wage cycle not found");
    }

    const records = await sql<
      {
        id: string;
        worker_id: string;
        worker_name: string;
        worker_type: string;
        gross_wage: string;
        advance_deduction: string;
        damage_deduction: string;
        discretionary_amount: string;
        net_payable: string;
        actual_paid: string;
      }[]
    >`
      SELECT
        wr.id, wr.worker_id, u.name as worker_name, wr.worker_type,
        wr.gross_wage, wr.advance_deduction, wr.damage_deduction,
        wr.discretionary_amount, wr.net_payable, wr.actual_paid
      FROM wage_records wr
      JOIN users u ON u.id = wr.worker_id
      WHERE wr.wage_cycle_id = ${cycleId} AND wr.tenant_id = ${tenantId}
      ORDER BY wr.worker_type, u.name
    `;

    return {
      cycle: {
        id: cycle[0].id,
        cycleNumber: cycle[0].cycle_number,
        startDate: cycle[0].cycle_start_date,
        endDate: cycle[0].cycle_end_date,
        status: cycle[0].status,
      },
      records: records.map((r) => ({
        id: r.id,
        workerId: r.worker_id,
        workerName: r.worker_name,
        workerType: r.worker_type,
        grossWage: parseFloat(r.gross_wage),
        advanceDeduction: parseFloat(r.advance_deduction),
        damageDeduction: parseFloat(r.damage_deduction),
        discretionaryAmount: parseFloat(r.discretionary_amount),
        netPayable: parseFloat(r.net_payable),
        actualPaid: parseFloat(r.actual_paid),
      })),
    };
  }

  async wagerDamage(
    tenantId: string,
    query: { fromDate?: string; toDate?: string; wagerId?: string },
  ) {
    const rows = await sql<
      {
        wager_id: string;
        wager_name: string;
        total_produced: string;
        total_damaged: string;
        damage_pct: string;
      }[]
    >`
      SELECT
        wp.id as wager_id,
        u.name as wager_name,
        COALESCE((
          SELECT SUM(pr.piece_count) FROM production_returns pr
          WHERE pr.wager_id = wp.user_id AND pr.tenant_id = ${tenantId}
          ${query.fromDate ? sql`AND pr.created_at >= ${query.fromDate}` : sql``}
          ${query.toDate ? sql`AND pr.created_at <= ${query.toDate}` : sql``}
        ), 0) as total_produced,
        COALESCE((
          SELECT SUM(dr.damage_count) FROM damage_records dr
          WHERE dr.wager_id = wp.id AND dr.tenant_id = ${tenantId} AND dr.approval_status = 'approved'
          ${query.fromDate ? sql`AND dr.created_at >= ${query.fromDate}` : sql``}
          ${query.toDate ? sql`AND dr.created_at <= ${query.toDate}` : sql``}
        ), 0) as total_damaged,
        CASE WHEN COALESCE((
          SELECT SUM(pr.piece_count) FROM production_returns pr
          WHERE pr.wager_id = wp.user_id AND pr.tenant_id = ${tenantId}
        ), 0) > 0
        THEN ROUND(
          COALESCE((SELECT SUM(dr.damage_count) FROM damage_records dr WHERE dr.wager_id = wp.id AND dr.tenant_id = ${tenantId} AND dr.approval_status = 'approved'), 0) * 100.0
          / COALESCE((SELECT SUM(pr.piece_count) FROM production_returns pr WHERE pr.wager_id = wp.user_id AND pr.tenant_id = ${tenantId}), 1),
          2
        )
        ELSE 0
        END as damage_pct
      FROM wager_profiles wp
      JOIN users u ON u.id = wp.user_id
      WHERE wp.tenant_id = ${tenantId} AND wp.is_active = true
      ${query.wagerId ? sql`AND wp.id = ${query.wagerId}` : sql``}
      ORDER BY damage_pct DESC
    `;

    return rows.map((r) => ({
      wagerId: r.wager_id,
      wagerName: r.wager_name,
      totalProduced: parseInt(r.total_produced, 10),
      totalDamaged: parseInt(r.total_damaged, 10),
      damagePct: parseFloat(r.damage_pct),
    }));
  }

  async wagerUtilization(
    tenantId: string,
    query: { fromDate?: string; toDate?: string },
  ) {
    const rows = await sql<
      {
        wager_id: string;
        wager_name: string;
        total_production_days: string;
        total_downtime_hours: string;
      }[]
    >`
      SELECT
        wp.id as wager_id,
        u.name as wager_name,
        COALESCE((
          SELECT COUNT(DISTINCT DATE(pr.created_at)) FROM production_returns pr
          WHERE pr.wager_id = wp.user_id AND pr.tenant_id = ${tenantId}
          ${query.fromDate ? sql`AND pr.created_at >= ${query.fromDate}` : sql``}
          ${query.toDate ? sql`AND pr.created_at <= ${query.toDate}` : sql``}
        ), 0) as total_production_days,
        COALESCE((
          SELECT SUM(ld.duration_minutes) / 60.0 FROM loom_downtimes ld
          JOIN looms l ON l.id = ld.loom_id
          WHERE l.assigned_wager_id = wp.user_id AND ld.tenant_id = ${tenantId}
          ${query.fromDate ? sql`AND ld.created_at >= ${query.fromDate}` : sql``}
          ${query.toDate ? sql`AND ld.created_at <= ${query.toDate}` : sql``}
        ), 0) as total_downtime_hours
      FROM wager_profiles wp
      JOIN users u ON u.id = wp.user_id
      WHERE wp.tenant_id = ${tenantId} AND wp.is_active = true
      ORDER BY total_production_days DESC
    `;

    return rows.map((r) => ({
      wagerId: r.wager_id,
      wagerName: r.wager_name,
      totalProductionDays: parseInt(r.total_production_days, 10),
      totalDowntimeHours: parseFloat(r.total_downtime_hours),
    }));
  }

  async wagerAdvance(tenantId: string) {
    const rows = await sql<
      {
        wager_id: string;
        wager_name: string;
        advance_balance: string;
        original_advance: string;
        additional_advances: string;
      }[]
    >`
      SELECT
        wp.id as wager_id,
        u.name as wager_name,
        wp.advance_balance,
        wp.original_advance,
        wp.additional_advances
      FROM wager_profiles wp
      JOIN users u ON u.id = wp.user_id
      WHERE wp.tenant_id = ${tenantId} AND wp.is_active = true
      ORDER BY wp.advance_balance DESC
    `;

    return rows.map((r) => ({
      wagerId: r.wager_id,
      wagerName: r.wager_name,
      advanceBalance: parseFloat(r.advance_balance),
      originalAdvance: parseFloat(r.original_advance),
      additionalAdvances: parseFloat(r.additional_advances),
    }));
  }

  // Inventory Reports
  async coneStock(
    tenantId: string,
    query: { godownId?: string; productId?: string; color?: string },
  ) {
    const rows = await sql<
      {
        godown_id: string;
        godown_name: string;
        product_id: string;
        product_name: string;
        color: string;
        quantity_kg: string;
      }[]
    >`
      SELECT
        g.id as godown_id, g.name as godown_name,
        p.id as product_id, p.name as product_name,
        i.color,
        COALESCE(i.weight_kg, 0) as quantity_kg
      FROM inventory i
      JOIN godowns g ON g.id = i.godown_id
      JOIN products p ON p.id = i.product_id
      WHERE i.tenant_id = ${tenantId} AND i.stage = 'raw_cone'
      ${query.godownId ? sql`AND i.godown_id = ${query.godownId}` : sql``}
      ${query.productId ? sql`AND i.product_id = ${query.productId}` : sql``}
      ${query.color ? sql`AND i.color = ${query.color}` : sql``}
      ORDER BY g.name, p.name, i.color
    `;

    return rows.map((r) => ({
      godownId: r.godown_id,
      godownName: r.godown_name,
      productId: r.product_id,
      productName: r.product_name,
      color: r.color,
      quantityKg: parseFloat(r.quantity_kg),
    }));
  }

  async finishedStock(
    tenantId: string,
    query: { godownId?: string; productId?: string },
  ) {
    const rows = await sql<
      {
        stage: string;
        product_id: string;
        product_name: string;
        color: string;
        quantity_pieces: string;
      }[]
    >`
      SELECT
        i.stage,
        p.id as product_id, p.name as product_name,
        i.color,
        COALESCE(i.quantity, 0) as quantity_pieces
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      WHERE i.tenant_id = ${tenantId} AND i.stage NOT IN ('raw_cone')
      ${query.godownId ? sql`AND i.godown_id = ${query.godownId}` : sql``}
      ${query.productId ? sql`AND i.product_id = ${query.productId}` : sql``}
      ORDER BY i.stage, p.name, i.color
    `;

    return rows.map((r) => ({
      stage: r.stage,
      productId: r.product_id,
      productName: r.product_name,
      color: r.color,
      quantityPieces: parseInt(r.quantity_pieces, 10),
    }));
  }

  async stockMovement(
    tenantId: string,
    query: {
      fromDate?: string;
      toDate?: string;
      productId?: string;
      godownId?: string;
      stage?: string;
    },
  ) {
    const rows = await sql<
      {
        id: string;
        product_id: string;
        product_name: string;
        color: string;
        stage: string;
        movement_type: string;
        quantity_change: string;
        weight_change_kg: string | null;
        reference_type: string;
        created_at: Date;
      }[]
    >`
      SELECT
        im.id, i.product_id, p.name as product_name,
        i.color, i.stage,
        im.movement_type,
        im.quantity_change,
        im.weight_change_kg,
        im.reference_type,
        im.created_at
      FROM inventory_movements im
      JOIN inventory i ON i.id = im.inventory_id
      JOIN products p ON p.id = i.product_id
      WHERE im.tenant_id = ${tenantId}
      ${query.fromDate ? sql`AND im.created_at >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND im.created_at <= ${query.toDate}` : sql``}
      ${query.productId ? sql`AND i.product_id = ${query.productId}` : sql``}
      ${query.godownId ? sql`AND i.godown_id = ${query.godownId}` : sql``}
      ${query.stage ? sql`AND i.stage = ${query.stage}` : sql``}
      ORDER BY im.created_at DESC
      LIMIT 100
    `;

    return rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      color: r.color,
      stage: r.stage,
      movementType: r.movement_type,
      quantityChange: parseFloat(r.quantity_change),
      weightChangeKg: r.weight_change_kg
        ? parseFloat(r.weight_change_kg)
        : null,
      referenceType: r.reference_type,
      createdAt: r.created_at,
    }));
  }

  // Finance Reports
  async gstSummary(
    tenantId: string,
    query: { fromDate?: string; toDate?: string },
  ) {
    const rows = await sql<
      {
        tax_type: string;
        total_subtotal: string;
        total_cgst: string;
        total_sgst: string;
        total_igst: string;
        total_amount: string;
        invoice_count: string;
      }[]
    >`
      SELECT
        tax_type,
        SUM(subtotal) as total_subtotal,
        SUM(cgst_amount) as total_cgst,
        SUM(sgst_amount) as total_sgst,
        SUM(igst_amount) as total_igst,
        SUM(total_amount) as total_amount,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE tenant_id = ${tenantId} AND status != 'draft' AND status != 'cancelled'
      ${query.fromDate ? sql`AND invoice_date >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND invoice_date <= ${query.toDate}` : sql``}
      GROUP BY tax_type
    `;

    return rows.map((r) => ({
      taxType: r.tax_type,
      totalSubtotal: parseFloat(r.total_subtotal),
      totalCgst: parseFloat(r.total_cgst),
      totalSgst: parseFloat(r.total_sgst),
      totalIgst: parseFloat(r.total_igst),
      totalAmount: parseFloat(r.total_amount),
      invoiceCount: parseInt(r.invoice_count, 10),
    }));
  }

  async supplierLedger(
    tenantId: string,
    query: { fromDate?: string; toDate?: string; supplierId?: string },
  ) {
    const rows = await sql<
      {
        supplier_id: string;
        supplier_name: string;
        total_purchases: string;
        total_quantity_kg: string;
        purchase_count: string;
      }[]
    >`
      SELECT
        s.id as supplier_id,
        s.name as supplier_name,
        COALESCE(SUM(cp.total_cost), 0) as total_purchases,
        COALESCE(SUM(cp.quantity_kg), 0) as total_quantity_kg,
        COUNT(cp.id) as purchase_count
      FROM suppliers s
      LEFT JOIN cone_purchases cp ON cp.supplier_id = s.id AND cp.tenant_id = ${tenantId}
        ${query.fromDate ? sql`AND cp.purchase_date >= ${query.fromDate}` : sql``}
        ${query.toDate ? sql`AND cp.purchase_date <= ${query.toDate}` : sql``}
      WHERE s.tenant_id = ${tenantId}
      ${query.supplierId ? sql`AND s.id = ${query.supplierId}` : sql``}
      GROUP BY s.id, s.name
      ORDER BY total_purchases DESC
    `;

    return rows.map((r) => ({
      supplierId: r.supplier_id,
      supplierName: r.supplier_name,
      totalPurchases: parseFloat(r.total_purchases),
      totalQuantityKg: parseFloat(r.total_quantity_kg),
      purchaseCount: parseInt(r.purchase_count, 10),
    }));
  }

  async revenue(
    tenantId: string,
    query: { fromDate?: string; toDate?: string; groupBy?: string },
  ) {
    const groupBy = query.groupBy || "month";
    const dateExpr =
      groupBy === "day"
        ? sql`invoice_date`
        : groupBy === "week"
          ? sql`DATE_TRUNC('week', invoice_date)::date`
          : sql`DATE_TRUNC('month', invoice_date)::date`;

    const rows = await sql<
      {
        period: string;
        total_revenue: string;
        total_collected: string;
        invoice_count: string;
      }[]
    >`
      SELECT
        ${dateExpr} as period,
        SUM(total_amount) as total_revenue,
        SUM(amount_paid) as total_collected,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE tenant_id = ${tenantId} AND status != 'draft' AND status != 'cancelled'
      ${query.fromDate ? sql`AND invoice_date >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND invoice_date <= ${query.toDate}` : sql``}
      GROUP BY ${dateExpr}
      ORDER BY period DESC
    `;

    return rows.map((r) => ({
      period: r.period,
      totalRevenue: parseFloat(r.total_revenue),
      totalCollected: parseFloat(r.total_collected),
      invoiceCount: parseInt(r.invoice_count, 10),
    }));
  }

  // Customer Receivables Aging Report (0-30 / 30-60 / 60-90 / 90+ day brackets)
  async customerAging(tenantId: string) {
    const rows = await sql<
      {
        customer_id: string;
        customer_name: string;
        bucket_0_30: string;
        bucket_30_60: string;
        bucket_60_90: string;
        bucket_90_plus: string;
        total_outstanding: string;
      }[]
    >`
      SELECT
        c.id as customer_id,
        c.name as customer_name,
        COALESCE(SUM(CASE WHEN NOW()::date - inv.due_date BETWEEN 0 AND 30 THEN inv.balance_due ELSE 0 END), 0) as bucket_0_30,
        COALESCE(SUM(CASE WHEN NOW()::date - inv.due_date BETWEEN 31 AND 60 THEN inv.balance_due ELSE 0 END), 0) as bucket_30_60,
        COALESCE(SUM(CASE WHEN NOW()::date - inv.due_date BETWEEN 61 AND 90 THEN inv.balance_due ELSE 0 END), 0) as bucket_60_90,
        COALESCE(SUM(CASE WHEN NOW()::date - inv.due_date > 90 THEN inv.balance_due ELSE 0 END), 0) as bucket_90_plus,
        COALESCE(SUM(inv.balance_due), 0) as total_outstanding
      FROM customers c
      LEFT JOIN invoices inv ON inv.customer_id = c.id AND inv.tenant_id = ${tenantId}
        AND inv.status IN ('issued', 'partially_paid', 'overdue')
        AND inv.balance_due > 0
      WHERE c.tenant_id = ${tenantId}
      GROUP BY c.id, c.name
      HAVING COALESCE(SUM(inv.balance_due), 0) > 0
      ORDER BY total_outstanding DESC
    `;

    return rows.map((r) => ({
      customerId: r.customer_id,
      customerName: r.customer_name,
      bucket0to30: parseFloat(r.bucket_0_30),
      bucket30to60: parseFloat(r.bucket_30_60),
      bucket60to90: parseFloat(r.bucket_60_90),
      bucket90Plus: parseFloat(r.bucket_90_plus),
      totalOutstanding: parseFloat(r.total_outstanding),
    }));
  }

  // Downtime Report — aggregated by reason, loom, and wager
  async downtimeReport(
    tenantId: string,
    query: {
      fromDate?: string;
      toDate?: string;
      groupBy?: string;
    },
  ) {
    const groupByCol = query.groupBy || "reason";

    if (groupByCol === "loom") {
      const rows = await sql<
        {
          loom_id: string;
          loom_number: string;
          total_minutes: string;
          incident_count: string;
        }[]
      >`
        SELECT
          l.id as loom_id,
          l.loom_number,
          COALESCE(SUM(ld.duration_minutes), 0) as total_minutes,
          COUNT(ld.id) as incident_count
        FROM looms l
        LEFT JOIN loom_downtimes ld ON ld.loom_id = l.id AND ld.tenant_id = ${tenantId}
          ${query.fromDate ? sql`AND ld.created_at >= ${query.fromDate}` : sql``}
          ${query.toDate ? sql`AND ld.created_at <= ${query.toDate}` : sql``}
        WHERE l.tenant_id = ${tenantId}
        GROUP BY l.id, l.loom_number
        HAVING COUNT(ld.id) > 0
        ORDER BY total_minutes DESC
      `;
      return rows.map((r) => ({
        loomId: r.loom_id,
        loomNumber: r.loom_number,
        totalMinutes: parseInt(r.total_minutes, 10),
        totalHours: parseFloat((parseInt(r.total_minutes, 10) / 60).toFixed(2)),
        incidentCount: parseInt(r.incident_count, 10),
      }));
    }

    if (groupByCol === "wager") {
      const rows = await sql<
        {
          wager_id: string;
          wager_name: string;
          total_minutes: string;
          incident_count: string;
        }[]
      >`
        SELECT
          wp.id as wager_id,
          u.name as wager_name,
          COALESCE(SUM(ld.duration_minutes), 0) as total_minutes,
          COUNT(ld.id) as incident_count
        FROM wager_profiles wp
        JOIN users u ON u.id = wp.user_id
        LEFT JOIN looms l ON l.assigned_wager_id = wp.user_id AND l.tenant_id = ${tenantId}
        LEFT JOIN loom_downtimes ld ON ld.loom_id = l.id AND ld.tenant_id = ${tenantId}
          ${query.fromDate ? sql`AND ld.created_at >= ${query.fromDate}` : sql``}
          ${query.toDate ? sql`AND ld.created_at <= ${query.toDate}` : sql``}
        WHERE wp.tenant_id = ${tenantId} AND wp.is_active = true
        GROUP BY wp.id, u.name
        HAVING COUNT(ld.id) > 0
        ORDER BY total_minutes DESC
      `;
      return rows.map((r) => ({
        wagerId: r.wager_id,
        wagerName: r.wager_name,
        totalMinutes: parseInt(r.total_minutes, 10),
        totalHours: parseFloat((parseInt(r.total_minutes, 10) / 60).toFixed(2)),
        incidentCount: parseInt(r.incident_count, 10),
      }));
    }

    // Default: group by reason
    const rows = await sql<
      { reason: string; total_minutes: string; incident_count: string }[]
    >`
      SELECT
        ld.reason,
        COALESCE(SUM(ld.duration_minutes), 0) as total_minutes,
        COUNT(*) as incident_count
      FROM loom_downtimes ld
      WHERE ld.tenant_id = ${tenantId}
      ${query.fromDate ? sql`AND ld.created_at >= ${query.fromDate}` : sql``}
      ${query.toDate ? sql`AND ld.created_at <= ${query.toDate}` : sql``}
      GROUP BY ld.reason
      ORDER BY total_minutes DESC
    `;

    return rows.map((r) => ({
      reason: r.reason,
      totalMinutes: parseInt(r.total_minutes, 10),
      totalHours: parseFloat((parseInt(r.total_minutes, 10) / 60).toFixed(2)),
      incidentCount: parseInt(r.incident_count, 10),
    }));
  }

  // Shift-wise Production Report
  async shiftProduction(
    tenantId: string,
    query: { fromDate?: string; toDate?: string; productId?: string },
  ) {
    const rows = await sql<
      {
        shift_id: string;
        shift_name: string;
        total_weight_kg: string;
        total_piece_count: string;
        return_count: string;
      }[]
    >`
      SELECT
        s.id as shift_id,
        s.name as shift_name,
        COALESCE(SUM(pr.weight_kg), 0) as total_weight_kg,
        COALESCE(SUM(pr.piece_count), 0) as total_piece_count,
        COUNT(pr.id) as return_count
      FROM shifts s
      LEFT JOIN production_returns pr ON pr.shift_id = s.id AND pr.tenant_id = ${tenantId}
        ${query.fromDate ? sql`AND pr.return_date >= ${query.fromDate}` : sql``}
        ${query.toDate ? sql`AND pr.return_date <= ${query.toDate}` : sql``}
        ${query.productId ? sql`AND pr.product_id = ${query.productId}` : sql``}
      WHERE s.tenant_id = ${tenantId}
      GROUP BY s.id, s.name
      ORDER BY s.name
    `;

    return rows.map((r) => ({
      shiftId: r.shift_id,
      shiftName: r.shift_name,
      totalWeightKg: parseFloat(r.total_weight_kg),
      totalPieceCount: parseInt(r.total_piece_count, 10),
      returnCount: parseInt(r.return_count, 10),
    }));
  }
}
