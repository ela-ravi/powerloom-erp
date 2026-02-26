import { describe, it, expect } from "vitest";
import {
  uuidSchema,
  phoneSchema,
  pinSchema,
  paginationSchema,
} from "../schemas.js";

describe("shared schemas", () => {
  describe("uuidSchema", () => {
    it("accepts valid UUID", () => {
      const result = uuidSchema.safeParse(
        "550e8400-e29b-41d4-a716-446655440000",
      );
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      const result = uuidSchema.safeParse("not-a-uuid");
      expect(result.success).toBe(false);
    });
  });

  describe("phoneSchema", () => {
    it("accepts valid phone", () => {
      const result = phoneSchema.safeParse("+919876543210");
      expect(result.success).toBe(true);
    });

    it("rejects phone without +", () => {
      const result = phoneSchema.safeParse("9876543210");
      expect(result.success).toBe(false);
    });

    it("rejects too short phone", () => {
      const result = phoneSchema.safeParse("+12345");
      expect(result.success).toBe(false);
    });
  });

  describe("pinSchema", () => {
    it("accepts 4-digit PIN", () => {
      const result = pinSchema.safeParse("1234");
      expect(result.success).toBe(true);
    });

    it("rejects non-4-digit PIN", () => {
      expect(pinSchema.safeParse("123").success).toBe(false);
      expect(pinSchema.safeParse("12345").success).toBe(false);
      expect(pinSchema.safeParse("abcd").success).toBe(false);
    });
  });

  describe("paginationSchema", () => {
    it("provides defaults", () => {
      const result = paginationSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.sortOrder).toBe("asc");
    });

    it("coerces string numbers", () => {
      const result = paginationSchema.parse({ limit: "50", offset: "10" });
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });

    it("enforces max limit", () => {
      const result = paginationSchema.safeParse({ limit: "200" });
      expect(result.success).toBe(false);
    });
  });
});
