import { describe, it, expect } from "vitest";

describe("Scheduler", () => {
  it("exports startScheduler function", async () => {
    const mod = await import("../scheduler.js");
    expect(typeof mod.startScheduler).toBe("function");
  });

  it("exports runOverdueDetection function", async () => {
    const mod = await import("../scheduler.js");
    expect(typeof mod.runOverdueDetection).toBe("function");
  });

  it("exports runCreditDueApproaching function", async () => {
    const mod = await import("../scheduler.js");
    expect(typeof mod.runCreditDueApproaching).toBe("function");
  });

  it("exports runFraudDetectionScan function", async () => {
    const mod = await import("../scheduler.js");
    expect(typeof mod.runFraudDetectionScan).toBe("function");
  });

  it("exports runWageCycleAutoGeneration function", async () => {
    const mod = await import("../scheduler.js");
    expect(typeof mod.runWageCycleAutoGeneration).toBe("function");
  });
});

describe("Overdue Job", () => {
  it("exports runOverdueDetection function", async () => {
    const mod = await import("../overdue.job.js");
    expect(typeof mod.runOverdueDetection).toBe("function");
  });
});

describe("Credit Due Job", () => {
  it("exports runCreditDueApproaching function", async () => {
    const mod = await import("../credit-due.job.js");
    expect(typeof mod.runCreditDueApproaching).toBe("function");
  });
});

describe("Fraud Scan Job", () => {
  it("exports runFraudDetectionScan function", async () => {
    const mod = await import("../fraud-scan.job.js");
    expect(typeof mod.runFraudDetectionScan).toBe("function");
  });
});

describe("Wage Cycle Job", () => {
  it("exports runWageCycleAutoGeneration function", async () => {
    const mod = await import("../wage-cycle.job.js");
    expect(typeof mod.runWageCycleAutoGeneration).toBe("function");
  });
});
