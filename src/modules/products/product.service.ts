import { sql } from "../../config/database.js";
import { AppError } from "../../shared/errors.js";

interface ProductRow {
  id: string;
  tenant_id: string;
  name: string;
  size: string;
  actual_size: string | null;
  category: string;
  paavu_to_piece_ratio: string;
  paavu_consumption_grams: string;
  paavu_wastage_grams: string;
  paavu_wastage_pct: string | null;
  oodai_consumption_grams: string;
  oodai_wastage_grams: string;
  oodai_wastage_pct: string | null;
  oodai_kg_per_paavu: string | null;
  wage_rate_per_kg: string;
  wage_rate_per_piece: string;
  stitch_rate_per_piece: string;
  knot_rate_per_piece: string;
  small_bundle_count: number;
  large_bundle_count: number;
  bundle_rate_small: string;
  bundle_rate_large: string;
  gst_rate_pct: string;
  color_pricing_mode: string;
  hsn_code: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface ColorPriceRow {
  id: string;
  tenant_id: string;
  product_id: string;
  color: string;
  selling_price_per_piece: string;
  created_at: Date;
  updated_at: Date;
}

interface ShiftRateRow {
  id: string;
  tenant_id: string;
  product_id: string;
  shift: string;
  wage_rate_per_kg: string;
  wage_rate_per_piece: string;
  created_at: Date;
  updated_at: Date;
}

function toProductResponse(row: ProductRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    size: row.size,
    actualSize: row.actual_size ?? null,
    category: row.category,
    paavuToPieceRatio: parseFloat(row.paavu_to_piece_ratio),
    paavuConsumptionGrams: parseFloat(row.paavu_consumption_grams),
    paavuWastageGrams: parseFloat(row.paavu_wastage_grams),
    paavuWastagePct: row.paavu_wastage_pct
      ? parseFloat(row.paavu_wastage_pct)
      : null,
    oodaiConsumptionGrams: parseFloat(row.oodai_consumption_grams),
    oodaiWastageGrams: parseFloat(row.oodai_wastage_grams),
    oodaiWastagePct: row.oodai_wastage_pct
      ? parseFloat(row.oodai_wastage_pct)
      : null,
    oodaiKgPerPaavu: row.oodai_kg_per_paavu
      ? parseFloat(row.oodai_kg_per_paavu)
      : null,
    wageRatePerKg: parseFloat(row.wage_rate_per_kg),
    wageRatePerPiece: parseFloat(row.wage_rate_per_piece),
    stitchRatePerPiece: parseFloat(row.stitch_rate_per_piece),
    knotRatePerPiece: parseFloat(row.knot_rate_per_piece),
    smallBundleCount: row.small_bundle_count,
    largeBundleCount: row.large_bundle_count,
    bundleRateSmall: parseFloat(row.bundle_rate_small),
    bundleRateLarge: parseFloat(row.bundle_rate_large),
    gstRatePct: parseFloat(row.gst_rate_pct),
    colorPricingMode: row.color_pricing_mode,
    hsnCode: row.hsn_code,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toColorPriceResponse(row: ColorPriceRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    color: row.color,
    sellingPricePerPiece: parseFloat(row.selling_price_per_piece),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toShiftRateResponse(row: ShiftRateRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    shift: row.shift,
    wageRatePerKg: parseFloat(row.wage_rate_per_kg),
    wageRatePerPiece: parseFloat(row.wage_rate_per_piece),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProductService {
  async create(tenantId: string, data: Record<string, any>) {
    const existing = await sql<ProductRow[]>`
      SELECT id FROM products
      WHERE tenant_id = ${tenantId} AND name = ${data.name} AND size = ${data.size}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Product with this name and size already exists");
    }

    // Auto-compute oodai consumption grams from oodaiKgPerPaavu and paavuToPieceRatio
    const oodaiConsumptionGrams =
      data.oodaiKgPerPaavu != null && data.paavuToPieceRatio
        ? (data.oodaiKgPerPaavu * 1000) / data.paavuToPieceRatio
        : data.oodaiConsumptionGrams ?? 0;

    const result = await sql<ProductRow[]>`
      INSERT INTO products (
        tenant_id, name, size, actual_size, category,
        paavu_to_piece_ratio, paavu_consumption_grams, paavu_wastage_grams, paavu_wastage_pct,
        oodai_consumption_grams, oodai_wastage_grams, oodai_wastage_pct, oodai_kg_per_paavu,
        wage_rate_per_kg, wage_rate_per_piece, stitch_rate_per_piece, knot_rate_per_piece,
        small_bundle_count, large_bundle_count, bundle_rate_small, bundle_rate_large,
        gst_rate_pct, color_pricing_mode, hsn_code
      ) VALUES (
        ${tenantId}, ${data.name}, ${data.size}, ${data.actualSize ?? null}, ${data.category},
        ${data.paavuToPieceRatio}, ${data.paavuConsumptionGrams ?? 0}, ${data.paavuWastageGrams ?? 0}, ${data.paavuWastagePct ?? null},
        ${oodaiConsumptionGrams}, ${data.oodaiWastageGrams ?? 0}, ${data.oodaiWastagePct ?? null}, ${data.oodaiKgPerPaavu ?? null},
        ${data.wageRatePerKg ?? 0}, ${data.wageRatePerPiece ?? 0}, ${data.stitchRatePerPiece ?? 0}, ${data.knotRatePerPiece ?? 0},
        ${data.smallBundleCount ?? 10}, ${data.largeBundleCount ?? 50}, ${data.bundleRateSmall ?? 0}, ${data.bundleRateLarge ?? 0},
        ${data.gstRatePct ?? 5.0}, ${data.colorPricingMode ?? "average"}, ${data.hsnCode ?? null}
      )
      RETURNING *
    `;
    return toProductResponse(result[0]);
  }

  async findAll(
    tenantId: string,
    query: {
      limit?: number;
      offset?: number;
      category?: string;
      isActive?: boolean;
    } = {},
  ) {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const countResult = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM products
      WHERE tenant_id = ${tenantId}
      ${query.category ? sql`AND category = ${query.category}` : sql``}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
    `;
    const total = parseInt(countResult[0].count, 10);

    const data = await sql<ProductRow[]>`
      SELECT * FROM products
      WHERE tenant_id = ${tenantId}
      ${query.category ? sql`AND category = ${query.category}` : sql``}
      ${query.isActive !== undefined ? sql`AND is_active = ${query.isActive}` : sql``}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return {
      data: data.map(toProductResponse),
      pagination: { total, limit, offset, hasMore: offset + limit < total },
    };
  }

  async findById(tenantId: string, id: string) {
    const result = await sql<ProductRow[]>`
      SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (result.length === 0) {
      throw AppError.notFound("Product not found");
    }
    return toProductResponse(result[0]);
  }

  async update(tenantId: string, id: string, data: Record<string, any>) {
    const existing = await sql<ProductRow[]>`
      SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Product not found");
    }

    if (data.name || data.size) {
      const checkName = data.name ?? existing[0].name;
      const checkSize = data.size ?? existing[0].size;
      const dup = await sql<ProductRow[]>`
        SELECT id FROM products
        WHERE tenant_id = ${tenantId} AND name = ${checkName} AND size = ${checkSize} AND id != ${id}
      `;
      if (dup.length > 0) {
        throw AppError.conflict(
          "Product with this name and size already exists",
        );
      }
    }

    // Auto-compute oodai consumption grams when oodaiKgPerPaavu is provided
    const effectiveRatio = data.paavuToPieceRatio ?? parseFloat(existing[0].paavu_to_piece_ratio);
    const effectiveOodaiKg = data.oodaiKgPerPaavu !== undefined
      ? data.oodaiKgPerPaavu
      : (existing[0].oodai_kg_per_paavu ? parseFloat(existing[0].oodai_kg_per_paavu) : null);
    const computedOodaiConsumption =
      effectiveOodaiKg != null && effectiveRatio
        ? (effectiveOodaiKg * 1000) / effectiveRatio
        : null;

    const result = await sql<ProductRow[]>`
      UPDATE products SET
        name = COALESCE(${data.name ?? null}, name),
        size = COALESCE(${data.size ?? null}, size),
        actual_size = ${data.actualSize !== undefined ? data.actualSize : existing[0].actual_size},
        category = COALESCE(${data.category ?? null}, category),
        paavu_to_piece_ratio = COALESCE(${data.paavuToPieceRatio ?? null}, paavu_to_piece_ratio),
        paavu_consumption_grams = COALESCE(${data.paavuConsumptionGrams ?? null}, paavu_consumption_grams),
        paavu_wastage_grams = COALESCE(${data.paavuWastageGrams ?? null}, paavu_wastage_grams),
        paavu_wastage_pct = ${data.paavuWastagePct !== undefined ? data.paavuWastagePct : existing[0].paavu_wastage_pct},
        oodai_consumption_grams = COALESCE(${computedOodaiConsumption ?? data.oodaiConsumptionGrams ?? null}, oodai_consumption_grams),
        oodai_wastage_grams = COALESCE(${data.oodaiWastageGrams ?? null}, oodai_wastage_grams),
        oodai_wastage_pct = ${data.oodaiWastagePct !== undefined ? data.oodaiWastagePct : existing[0].oodai_wastage_pct},
        oodai_kg_per_paavu = ${data.oodaiKgPerPaavu !== undefined ? data.oodaiKgPerPaavu : existing[0].oodai_kg_per_paavu},
        wage_rate_per_kg = COALESCE(${data.wageRatePerKg ?? null}, wage_rate_per_kg),
        wage_rate_per_piece = COALESCE(${data.wageRatePerPiece ?? null}, wage_rate_per_piece),
        stitch_rate_per_piece = COALESCE(${data.stitchRatePerPiece ?? null}, stitch_rate_per_piece),
        knot_rate_per_piece = COALESCE(${data.knotRatePerPiece ?? null}, knot_rate_per_piece),
        small_bundle_count = COALESCE(${data.smallBundleCount ?? null}, small_bundle_count),
        large_bundle_count = COALESCE(${data.largeBundleCount ?? null}, large_bundle_count),
        bundle_rate_small = COALESCE(${data.bundleRateSmall ?? null}, bundle_rate_small),
        bundle_rate_large = COALESCE(${data.bundleRateLarge ?? null}, bundle_rate_large),
        gst_rate_pct = COALESCE(${data.gstRatePct ?? null}, gst_rate_pct),
        color_pricing_mode = COALESCE(${data.colorPricingMode ?? null}, color_pricing_mode),
        hsn_code = ${data.hsnCode !== undefined ? data.hsnCode : existing[0].hsn_code},
        is_active = COALESCE(${data.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toProductResponse(result[0]);
  }

  // Color Prices
  async addColorPrice(
    tenantId: string,
    productId: string,
    data: { color: string; sellingPricePerPiece: number },
  ) {
    const product = await sql<ProductRow[]>`
      SELECT id, color_pricing_mode FROM products
      WHERE id = ${productId} AND tenant_id = ${tenantId}
    `;
    if (product.length === 0) {
      throw AppError.notFound("Product not found");
    }
    if (product[0].color_pricing_mode !== "per_color") {
      throw AppError.validation(
        "Color prices only available when color_pricing_mode is per_color",
      );
    }

    const existing = await sql<ColorPriceRow[]>`
      SELECT id FROM product_color_prices
      WHERE product_id = ${productId} AND color = ${data.color}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Color price already exists for this color");
    }

    const result = await sql<ColorPriceRow[]>`
      INSERT INTO product_color_prices (tenant_id, product_id, color, selling_price_per_piece)
      VALUES (${tenantId}, ${productId}, ${data.color}, ${data.sellingPricePerPiece})
      RETURNING *
    `;
    return toColorPriceResponse(result[0]);
  }

  async listColorPrices(tenantId: string, productId: string) {
    const product = await sql<ProductRow[]>`
      SELECT id FROM products WHERE id = ${productId} AND tenant_id = ${tenantId}
    `;
    if (product.length === 0) {
      throw AppError.notFound("Product not found");
    }

    const data = await sql<ColorPriceRow[]>`
      SELECT * FROM product_color_prices
      WHERE product_id = ${productId} AND tenant_id = ${tenantId}
      ORDER BY color ASC
    `;
    return data.map(toColorPriceResponse);
  }

  async updateColorPrice(
    tenantId: string,
    productId: string,
    priceId: string,
    data: Partial<{ color: string; sellingPricePerPiece: number }>,
  ) {
    const existing = await sql<ColorPriceRow[]>`
      SELECT * FROM product_color_prices
      WHERE id = ${priceId} AND product_id = ${productId} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Color price not found");
    }

    if (data.color) {
      const dup = await sql<ColorPriceRow[]>`
        SELECT id FROM product_color_prices
        WHERE product_id = ${productId} AND color = ${data.color} AND id != ${priceId}
      `;
      if (dup.length > 0) {
        throw AppError.conflict("Color price already exists for this color");
      }
    }

    const result = await sql<ColorPriceRow[]>`
      UPDATE product_color_prices SET
        color = COALESCE(${data.color ?? null}, color),
        selling_price_per_piece = COALESCE(${data.sellingPricePerPiece ?? null}, selling_price_per_piece),
        updated_at = NOW()
      WHERE id = ${priceId} AND product_id = ${productId} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toColorPriceResponse(result[0]);
  }

  async deleteColorPrice(tenantId: string, productId: string, priceId: string) {
    const existing = await sql<ColorPriceRow[]>`
      SELECT id FROM product_color_prices
      WHERE id = ${priceId} AND product_id = ${productId} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Color price not found");
    }

    await sql`
      DELETE FROM product_color_prices
      WHERE id = ${priceId} AND product_id = ${productId} AND tenant_id = ${tenantId}
    `;
  }

  // Shift Wage Rates
  async addShiftRate(
    tenantId: string,
    productId: string,
    data: { shift: string; wageRatePerKg: number; wageRatePerPiece: number },
  ) {
    const product = await sql<ProductRow[]>`
      SELECT id FROM products WHERE id = ${productId} AND tenant_id = ${tenantId}
    `;
    if (product.length === 0) {
      throw AppError.notFound("Product not found");
    }

    // Check if shift tracking is enabled for tenant
    const tenantSettings = await sql<{ shift_enabled: boolean }[]>`
      SELECT shift_enabled FROM tenant_settings
      WHERE tenant_id = ${tenantId}
    `;
    if (tenantSettings.length > 0 && !tenantSettings[0].shift_enabled) {
      throw AppError.validation(
        "Shift tracking is not enabled for this tenant",
      );
    }

    const existing = await sql<ShiftRateRow[]>`
      SELECT id FROM shift_wage_rates
      WHERE product_id = ${productId} AND shift = ${data.shift}
    `;
    if (existing.length > 0) {
      throw AppError.conflict("Shift rate already exists for this shift");
    }

    const result = await sql<ShiftRateRow[]>`
      INSERT INTO shift_wage_rates (tenant_id, product_id, shift, wage_rate_per_kg, wage_rate_per_piece)
      VALUES (${tenantId}, ${productId}, ${data.shift}, ${data.wageRatePerKg}, ${data.wageRatePerPiece})
      RETURNING *
    `;
    return toShiftRateResponse(result[0]);
  }

  async listShiftRates(tenantId: string, productId: string) {
    const product = await sql<ProductRow[]>`
      SELECT id FROM products WHERE id = ${productId} AND tenant_id = ${tenantId}
    `;
    if (product.length === 0) {
      throw AppError.notFound("Product not found");
    }

    const data = await sql<ShiftRateRow[]>`
      SELECT * FROM shift_wage_rates
      WHERE product_id = ${productId} AND tenant_id = ${tenantId}
      ORDER BY shift ASC
    `;
    return data.map(toShiftRateResponse);
  }

  async updateShiftRate(
    tenantId: string,
    productId: string,
    rateId: string,
    data: Partial<{ wageRatePerKg: number; wageRatePerPiece: number }>,
  ) {
    const existing = await sql<ShiftRateRow[]>`
      SELECT * FROM shift_wage_rates
      WHERE id = ${rateId} AND product_id = ${productId} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Shift rate not found");
    }

    const result = await sql<ShiftRateRow[]>`
      UPDATE shift_wage_rates SET
        wage_rate_per_kg = COALESCE(${data.wageRatePerKg ?? null}, wage_rate_per_kg),
        wage_rate_per_piece = COALESCE(${data.wageRatePerPiece ?? null}, wage_rate_per_piece),
        updated_at = NOW()
      WHERE id = ${rateId} AND product_id = ${productId} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return toShiftRateResponse(result[0]);
  }

  async delete(tenantId: string, id: string) {
    const existing = await sql<ProductRow[]>`
      SELECT * FROM products WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (existing.length === 0) {
      throw AppError.notFound("Product not found");
    }

    const stockInUse = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM inventory_stock
      WHERE tenant_id = ${tenantId} AND product_id = ${id}
    `;
    if (parseInt(stockInUse[0].count, 10) > 0) {
      throw AppError.conflict(
        "Cannot delete this product — it has inventory stock records",
      );
    }

    const pricesInUse = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM customer_product_prices
      WHERE tenant_id = ${tenantId} AND product_id = ${id}
    `;
    if (parseInt(pricesInUse[0].count, 10) > 0) {
      throw AppError.conflict(
        "Cannot delete this product — it has customer price records",
      );
    }

    const wageRatesInUse = await sql<{ count: string }[]>`
      SELECT COUNT(*) as count FROM shift_wage_rates
      WHERE tenant_id = ${tenantId} AND product_id = ${id}
    `;
    if (parseInt(wageRatesInUse[0].count, 10) > 0) {
      throw AppError.conflict(
        "Cannot delete this product — it has shift wage rate records",
      );
    }

    await sql`
      DELETE FROM products WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
  }
}
