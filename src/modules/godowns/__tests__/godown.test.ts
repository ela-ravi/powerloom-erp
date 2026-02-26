import { describe, it, expect } from "vitest";
import request from "supertest";
import { UserRole } from "../../../types/enums.js";
import {
  createGodownSchema,
  updateGodownSchema,
  godownListQuerySchema,
} from "../godown.schema.js";

describe("Godown Schemas", () => {
  describe("createGodownSchema", () => {
    it("accepts valid godown with name only", () => {
      const result = createGodownSchema.safeParse({
        name: "Main Warehouse",
      });
      expect(result.success).toBe(true);
    });

    it("defaults isMain to false", () => {
      const result = createGodownSchema.parse({
        name: "Main Warehouse",
      });
      expect(result.isMain).toBe(false);
    });

    it("defaults godownType to godown", () => {
      const result = createGodownSchema.parse({
        name: "Main Warehouse",
      });
      expect(result.godownType).toBe("godown");
    });

    it("accepts all godown types", () => {
      for (const type of ["godown", "paavu_pattarai"]) {
        expect(
          createGodownSchema.safeParse({
            name: "Test",
            godownType: type,
          }).success,
        ).toBe(true);
      }
    });

    it("rejects invalid godown type", () => {
      const result = createGodownSchema.safeParse({
        name: "Test",
        godownType: "factory",
      });
      expect(result.success).toBe(false);
    });

    it("accepts full godown data", () => {
      const result = createGodownSchema.safeParse({
        name: "Paavu Pattarai",
        address: "789 Industrial Area",
        isMain: false,
        godownType: "paavu_pattarai",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing name", () => {
      const result = createGodownSchema.safeParse({ isMain: true });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createGodownSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateGodownSchema", () => {
    it("accepts partial update", () => {
      const result = updateGodownSchema.safeParse({
        name: "Updated Warehouse",
      });
      expect(result.success).toBe(true);
    });

    it("accepts isMain field", () => {
      const result = updateGodownSchema.safeParse({ isMain: true });
      expect(result.success).toBe(true);
    });

    it("accepts isActive field", () => {
      const result = updateGodownSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it("accepts nullable address", () => {
      const result = updateGodownSchema.safeParse({ address: null });
      expect(result.success).toBe(true);
    });

    it("accepts empty object", () => {
      const result = updateGodownSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("godownListQuerySchema", () => {
    it("provides defaults", () => {
      const result = godownListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("accepts godownType filter", () => {
      const result = godownListQuerySchema.parse({
        godownType: "paavu_pattarai",
      });
      expect(result.godownType).toBe("paavu_pattarai");
    });

    it("transforms isActive string to boolean", () => {
      const result = godownListQuerySchema.parse({ isActive: "false" });
      expect(result.isActive).toBe(false);
    });
  });
});

describe("Godown Routes", () => {
  it("POST /api/godowns requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app)
      .post("/api/godowns")
      .send({ name: "Main Warehouse" });

    expect(res.status).toBe(401);
  });

  it("POST /api/godowns returns 400 for missing name", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.OWNER);

    const res = await request(app)
      .post("/api/godowns")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({}); // missing name

    expect(res.status).toBe(400);
  });

  it("PUT /api/godowns/:id requires master_data permission", async () => {
    const { app, getAuthToken } =
      await import("../../../../tests/utils/test-helpers.js");
    const { accessToken } = getAuthToken(undefined, undefined, UserRole.WAGER);

    const res = await request(app)
      .put("/api/godowns/some-id")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Updated" });

    expect(res.status).toBe(403);
  });

  it("GET /api/godowns requires authentication", async () => {
    const { app } = await import("../../../../tests/utils/test-helpers.js");

    const res = await request(app).get("/api/godowns");

    expect(res.status).toBe(401);
  });
});
