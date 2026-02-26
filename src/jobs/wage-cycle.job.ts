import { sql } from "../config/database.js";

export async function runWageCycleAutoGeneration(): Promise<{
  tenantsProcessed: number;
  cyclesCreated: number;
}> {
  const today = new Date().getDay(); // 0=Sunday, 1=Monday, etc.

  // Find tenants where today matches their wage_cycle_day
  const tenants = await sql<{ id: string; wage_cycle_day: number }[]>`
    SELECT t.id, COALESCE(ts.wage_cycle_day, 0) as wage_cycle_day
    FROM tenants t
    LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id
    WHERE t.status = 'active'
  `;

  let cyclesCreated = 0;
  const matchingTenants = tenants.filter((t) => t.wage_cycle_day === today);

  for (const tenant of matchingTenants) {
    try {
      // Get the next cycle number
      const lastCycle = await sql<{ max_cycle: string | null }[]>`
        SELECT MAX(cycle_number) as max_cycle
        FROM wage_cycles WHERE tenant_id = ${tenant.id}
      `;
      const nextCycleNum =
        (lastCycle[0].max_cycle ? parseInt(lastCycle[0].max_cycle, 10) : 0) + 1;

      // Get owner for created_by
      const owner = await sql<{ id: string }[]>`
        SELECT id FROM users WHERE tenant_id = ${tenant.id} AND role = 'owner' LIMIT 1
      `;
      if (owner.length === 0) continue;

      const startDate = new Date().toISOString().split("T")[0];
      const endDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      await sql`
        INSERT INTO wage_cycles (tenant_id, cycle_number, cycle_start_date, cycle_end_date, status, created_by)
        VALUES (${tenant.id}, ${nextCycleNum}, ${startDate}, ${endDate}, 'draft', ${owner[0].id})
      `;

      cyclesCreated++;
    } catch {
      // Error in one tenant shouldn't affect others
    }
  }

  return { tenantsProcessed: matchingTenants.length, cyclesCreated };
}
