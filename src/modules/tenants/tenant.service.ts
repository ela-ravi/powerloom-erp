import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";
import type { PaginationQuery, PaginatedResponse } from "../../types/api.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxSql = any;

export interface TenantRow {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  state_code: string;
  gstin: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface TenantSettingsRow {
  id: string;
  tenant_id: string;
  batch_enabled: boolean;
  shift_enabled: boolean;
  inter_godown_transfer_enabled: boolean;
  auth_otp_enabled: boolean;
  auth_pin_enabled: boolean;
  wage_cycle_day: number;
  default_credit_period_days: number;
  paavu_wastage_limit_grams: number;
  cone_bundle_weight_kg: string;
  damage_minor_deduction_pct: string;
  damage_major_deduction_pct: string;
  damage_reject_deduction_pct: string;
  show_wager_ranking: boolean;
  currency: string;
  locale: string;
  created_at: Date;
  updated_at: Date;
}

function toTenantResponse(row: TenantRow) {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    stateCode: row.state_code,
    gstin: row.gstin,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSettingsResponse(row: TenantSettingsRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    batchEnabled: row.batch_enabled,
    shiftEnabled: row.shift_enabled,
    interGodownTransferEnabled: row.inter_godown_transfer_enabled,
    authOtpEnabled: row.auth_otp_enabled,
    authPinEnabled: row.auth_pin_enabled,
    wageCycleDay: row.wage_cycle_day,
    defaultCreditPeriodDays: row.default_credit_period_days,
    paavuWastageLimitGrams: row.paavu_wastage_limit_grams,
    coneBundleWeightKg: parseFloat(row.cone_bundle_weight_kg),
    damageMinorDeductionPct: parseFloat(row.damage_minor_deduction_pct),
    damageMajorDeductionPct: parseFloat(row.damage_major_deduction_pct),
    damageRejectDeductionPct: parseFloat(row.damage_reject_deduction_pct),
    showWagerRanking: row.show_wager_ranking,
    currency: row.currency,
    locale: row.locale,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class TenantService {
  async create(data: {
    name: string;
    ownerName: string;
    phone: string;
    email?: string;
    address?: string;
    stateCode: string;
    gstin?: string;
  }) {
    // Check duplicate phone
    const existing = await sql<TenantRow[]>`
      SELECT id FROM tenants WHERE phone = ${data.phone}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Phone number already registered");
    }

    const result = await sql<TenantRow[]>`
      INSERT INTO tenants (name, owner_name, phone, email, address, state_code, gstin)
      VALUES (${data.name}, ${data.ownerName}, ${data.phone}, ${data.email ?? null}, ${data.address ?? null}, ${data.stateCode}, ${data.gstin ?? null})
      RETURNING *
    `;

    const tenant = result[0];

    // Auto-create tenant settings
    await sql`
      INSERT INTO tenant_settings (tenant_id)
      VALUES (${tenant.id})
    `;

    return toTenantResponse(tenant);
  }

  async createWithOwner(data: {
    name: string;
    ownerName: string;
    phone: string;
    email?: string;
    address?: string;
    stateCode: string;
    gstin?: string;
    status?: string;
  }) {
    // Check duplicate phone
    const existing = await sql<TenantRow[]>`
      SELECT id FROM tenants WHERE phone = ${data.phone}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Phone number already registered");
    }

    const result = await sql.begin(async (tx: TxSql) => {
      const tenants = await tx<TenantRow[]>`
        INSERT INTO tenants (name, owner_name, phone, email, address, state_code, gstin, status)
        VALUES (${data.name}, ${data.ownerName}, ${data.phone}, ${data.email ?? null}, ${data.address ?? null}, ${data.stateCode}, ${data.gstin ?? null}, ${data.status ?? "trial"})
        RETURNING *
      `;
      const tenant = tenants[0];

      // Auto-create tenant settings
      await tx`
        INSERT INTO tenant_settings (tenant_id)
        VALUES (${tenant.id})
      `;

      // Create owner user
      await tx`
        INSERT INTO users (tenant_id, phone, name, role, is_active)
        VALUES (${tenant.id}, ${data.phone}, ${data.ownerName}, 'owner', true)
      `;

      return tenant;
    });

    return toTenantResponse(result);
  }

  async findAll(
    pagination: PaginationQuery = {},
    filters: { search?: string; status?: string } = {},
  ) {
    const limit = pagination.limit ?? 20;
    const offset = pagination.offset ?? 0;

    const conditions: string[] = [];
    const searchPattern = filters.search ? `%${filters.search}%` : null;

    if (searchPattern) {
      const countResult = filters.status
        ? await sql<{ count: string }[]>`
            SELECT COUNT(*) as count FROM tenants
            WHERE (name ILIKE ${searchPattern} OR owner_name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern})
            AND status = ${filters.status}
          `
        : await sql<{ count: string }[]>`
            SELECT COUNT(*) as count FROM tenants
            WHERE name ILIKE ${searchPattern} OR owner_name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern}
          `;
      const total = parseInt(countResult[0].count, 10);

      const data = filters.status
        ? await sql<TenantRow[]>`
            SELECT * FROM tenants
            WHERE (name ILIKE ${searchPattern} OR owner_name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern})
            AND status = ${filters.status}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `
        : await sql<TenantRow[]>`
            SELECT * FROM tenants
            WHERE name ILIKE ${searchPattern} OR owner_name ILIKE ${searchPattern} OR phone ILIKE ${searchPattern}
            ORDER BY created_at DESC
            LIMIT ${limit} OFFSET ${offset}
          `;

      return {
        data: data.map(toTenantResponse),
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      };
    }

    if (filters.status) {
      const countResult = await sql<{ count: string }[]>`
        SELECT COUNT(*) as count FROM tenants WHERE status = ${filters.status}
      `;
      const total = parseInt(countResult[0].count, 10);

      const data = await sql<TenantRow[]>`
        SELECT * FROM tenants WHERE status = ${filters.status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      return {
        data: data.map(toTenantResponse),
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      };
    }

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM tenants
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<TenantRow[]>`
      SELECT * FROM tenants
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toTenantResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(id: string) {
    const result = await sql<TenantRow[]>`
      SELECT * FROM tenants WHERE id = ${id}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Tenant not found");
    }
    return toTenantResponse(result[0]);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      ownerName: string;
      phone: string;
      email: string | null;
      address: string | null;
      stateCode: string;
      gstin: string | null;
    }>,
  ) {
    const existing = await sql<TenantRow[]>`
      SELECT * FROM tenants WHERE id = ${id}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Tenant not found");
    }

    if (data.phone) {
      const dup = await sql<TenantRow[]>`
        SELECT id FROM tenants WHERE phone = ${data.phone} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.conflict("Phone number already registered");
      }
    }

    const result = await sql<TenantRow[]>`
      UPDATE tenants SET
        name = COALESCE(${data.name ?? null}, name),
        owner_name = COALESCE(${data.ownerName ?? null}, owner_name),
        phone = COALESCE(${data.phone ?? null}, phone),
        email = ${data.email !== undefined ? data.email : existing[0].email},
        address = ${data.address !== undefined ? data.address : existing[0].address},
        state_code = COALESCE(${data.stateCode ?? null}, state_code),
        gstin = ${data.gstin !== undefined ? data.gstin : existing[0].gstin},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return toTenantResponse(result[0]);
  }

  async updateStatus(id: string, status: string) {
    const result = await sql<TenantRow[]>`
      UPDATE tenants SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (result.length === 0) {
      throw AppError.notFound("Tenant not found");
    }
    return toTenantResponse(result[0]);
  }

  async getSettings(tenantId: string) {
    const result = await sql<TenantSettingsRow[]>`
      SELECT * FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Tenant settings not found");
    }
    return toSettingsResponse(result[0]);
  }

  async updateSettings(tenantId: string, data: Record<string, unknown>) {
    const existing = await sql<TenantSettingsRow[]>`
      SELECT * FROM tenant_settings WHERE tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Tenant settings not found");
    }

    const result = await sql<TenantSettingsRow[]>`
      UPDATE tenant_settings SET
        batch_enabled = COALESCE(${(data.batchEnabled as boolean) ?? null}, batch_enabled),
        shift_enabled = COALESCE(${(data.shiftEnabled as boolean) ?? null}, shift_enabled),
        inter_godown_transfer_enabled = COALESCE(${(data.interGodownTransferEnabled as boolean) ?? null}, inter_godown_transfer_enabled),
        auth_otp_enabled = COALESCE(${(data.authOtpEnabled as boolean) ?? null}, auth_otp_enabled),
        auth_pin_enabled = COALESCE(${(data.authPinEnabled as boolean) ?? null}, auth_pin_enabled),
        wage_cycle_day = COALESCE(${(data.wageCycleDay as number) ?? null}, wage_cycle_day),
        default_credit_period_days = COALESCE(${(data.defaultCreditPeriodDays as number) ?? null}, default_credit_period_days),
        paavu_wastage_limit_grams = COALESCE(${(data.paavuWastageLimitGrams as number) ?? null}, paavu_wastage_limit_grams),
        cone_bundle_weight_kg = COALESCE(${(data.coneBundleWeightKg as number) ?? null}, cone_bundle_weight_kg),
        damage_minor_deduction_pct = COALESCE(${(data.damageMinorDeductionPct as number) ?? null}, damage_minor_deduction_pct),
        damage_major_deduction_pct = COALESCE(${(data.damageMajorDeductionPct as number) ?? null}, damage_major_deduction_pct),
        damage_reject_deduction_pct = COALESCE(${(data.damageRejectDeductionPct as number) ?? null}, damage_reject_deduction_pct),
        show_wager_ranking = COALESCE(${(data.showWagerRanking as boolean) ?? null}, show_wager_ranking),
        currency = COALESCE(${(data.currency as string) ?? null}, currency),
        locale = COALESCE(${(data.locale as string) ?? null}, locale),
        updated_at = NOW()
      WHERE tenant_id = ${tenantId}
      RETURNING *
    `;

    return toSettingsResponse(result[0]);
  }
}
