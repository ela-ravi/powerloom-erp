import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createDamageRecordSchema,
  damageRecordListQuerySchema,
} from "../damage-record.schema.js";
import crypto from "crypto";

describe("Damage Record Schemas", () => {
  describe("createDamageRecordSchema", () => {
    const validData = {
      wagerId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      detectionPoint: "loom",
      grade: "minor",
      damageCount: 5,
      productionCostPerPiece: 40.0,
    };

    it("accepts valid damage record data", () => {
      const result = createDamageRecordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("accepts all detection points", () => {
      for (const dp of ["loom", "tailoring", "packaging", "godown"]) {
        const result = createDamageRecordSchema.safeParse({
          ...validData,
          detectionPoint: dp,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid detection point", () => {
      const result = createDamageRecordSchema.safeParse({
        ...validData,
        detectionPoint: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all damage grades", () => {
      for (const grade of ["minor", "major", "reject"]) {
        const result = createDamageRecordSchema.safeParse({
          ...validData,
          grade,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid grade", () => {
      const result = createDamageRecordSchema.safeParse({
        ...validData,
        grade: "critical",
      });
      expect(result.success).toBe(false);
    });

    it("rejects damage count of 0", () => {
      const result = createDamageRecordSchema.safeParse({
        ...validData,
        damageCount: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative damage count", () => {
      const result = createDamageRecordSchema.safeParse({
        ...validData,
        damageCount: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative production cost", () => {
      const result = createDamageRecordSchema.safeParse({
        ...validData,
        productionCostPerPiece: -10,
      });
      expect(result.success).toBe(false);
    });

    it("defaults isMiscellaneous to false", () => {
      const result = createDamageRecordSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isMiscellaneous).toBe(false);
      }
    });

    it("allows miscellaneous damage without wagerId", () => {
      const result = createDamageRecordSchema.safeParse({
        productId: crypto.randomUUID(),
        detectionPoint: "godown",
        grade: "major",
        damageCount: 3,
        productionCostPerPiece: 40.0,
        isMiscellaneous: true,
      });
      expect(result.success).toBe(true);
    });

    it("requires wagerId for non-miscellaneous damage", () => {
      const result = createDamageRecordSchema.safeParse({
        productId: crypto.randomUUID(),
        detectionPoint: "loom",
        grade: "minor",
        damageCount: 5,
        productionCostPerPiece: 40.0,
        isMiscellaneous: false,
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional productionReturnId", () => {
      const result = createDamageRecordSchema.safeParse({
        ...validData,
        productionReturnId: crypto.randomUUID(),
      });
      expect(result.success).toBe(true);
    });

    it("accepts optional notes", () => {
      const result = createDamageRecordSchema.safeParse({
        ...validData,
        notes: "Thread pull on edge",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing productId", () => {
      const { productId, ...noProduct } = validData;
      const result = createDamageRecordSchema.safeParse(noProduct);
      expect(result.success).toBe(false);
    });

    it("rejects missing detectionPoint", () => {
      const { detectionPoint, ...noDetection } = validData;
      const result = createDamageRecordSchema.safeParse(noDetection);
      expect(result.success).toBe(false);
    });

    it("rejects missing grade", () => {
      const { grade, ...noGrade } = validData;
      const result = createDamageRecordSchema.safeParse(noGrade);
      expect(result.success).toBe(false);
    });
  });

  describe("damageRecordListQuerySchema", () => {
    it("accepts empty query with defaults", () => {
      const result = damageRecordListQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it("accepts all filter combinations", () => {
      const result = damageRecordListQuerySchema.safeParse({
        wagerId: crypto.randomUUID(),
        detectionPoint: "loom",
        grade: "minor",
        approvalStatus: "pending",
      });
      expect(result.success).toBe(true);
    });

    it("coerces string limit/offset to numbers", () => {
      const result = damageRecordListQuerySchema.safeParse({
        limit: "10",
        offset: "5",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(5);
      }
    });

    it("rejects limit over 100", () => {
      const result = damageRecordListQuerySchema.safeParse({ limit: "101" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid approvalStatus", () => {
      const result = damageRecordListQuerySchema.safeParse({
        approvalStatus: "cancelled",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("Damage Record Routes", () => {
  it("POST /api/damage-records requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).post("/api/damage-records").send({
      wagerId: crypto.randomUUID(),
      productId: crypto.randomUUID(),
      detectionPoint: "loom",
      grade: "minor",
      damageCount: 5,
      productionCostPerPiece: 40.0,
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/damage-records requires production_entry permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .post("/api/damage-records")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        wagerId: crypto.randomUUID(),
        productId: crypto.randomUUID(),
        detectionPoint: "loom",
        grade: "minor",
        damageCount: 5,
        productionCostPerPiece: 40.0,
      });
    expect(res.status).toBe(403);
  });

  it("GET /api/damage-records requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get("/api/damage-records");
    expect(res.status).toBe(401);
  });

  it("GET /api/damage-records/:id requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).get(
      `/api/damage-records/${crypto.randomUUID()}`,
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/damage-records/:id/approve requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).put(
      `/api/damage-records/${crypto.randomUUID()}/approve`,
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/damage-records/:id/approve requires damage_approval permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .put(`/api/damage-records/${crypto.randomUUID()}/approve`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("PUT /api/damage-records/:id/reject requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");
    const res = await request(app).put(
      `/api/damage-records/${crypto.randomUUID()}/reject`,
    );
    expect(res.status).toBe(401);
  });

  it("PUT /api/damage-records/:id/reject requires damage_approval permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);
    const res = await request(app)
      .put(`/api/damage-records/${crypto.randomUUID()}/reject`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});
