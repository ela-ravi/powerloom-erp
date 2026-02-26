import { runOverdueDetection } from "./overdue.job.js";
import { runCreditDueApproaching } from "./credit-due.job.js";
import { runFraudDetectionScan } from "./fraud-scan.job.js";
import { runWageCycleAutoGeneration } from "./wage-cycle.job.js";

interface JobResult {
  job: string;
  startedAt: Date;
  completedAt: Date;
  result: Record<string, unknown>;
  error?: string;
}

async function executeJob(
  name: string,
  fn: () => Promise<Record<string, unknown>>,
): Promise<JobResult> {
  const startedAt = new Date();
  try {
    const result = await fn();
    return {
      job: name,
      startedAt,
      completedAt: new Date(),
      result,
    };
  } catch (err) {
    return {
      job: name,
      startedAt,
      completedAt: new Date(),
      result: {},
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function startScheduler() {
  // Dynamic import for node-cron (optional dependency)
  try {
    const moduleName = "node-cron";
    const cron = (await import(moduleName)) as {
      schedule: (expression: string, fn: () => void) => void;
    };

    // Overdue invoice detection — daily at midnight
    cron.schedule("0 0 * * *", async () => {
      const result = await executeJob("overdue-detection", runOverdueDetection);
      console.log("[Job]", result.job, result.result);
    });

    // Credit due approaching — daily at 8am
    cron.schedule("0 8 * * *", async () => {
      const result = await executeJob(
        "credit-due-approaching",
        runCreditDueApproaching,
      );
      console.log("[Job]", result.job, result.result);
    });

    // Fraud detection scan — daily at 2am
    cron.schedule("0 2 * * *", async () => {
      const result = await executeJob("fraud-scan", runFraudDetectionScan);
      console.log("[Job]", result.job, result.result);
    });

    // Wage cycle auto-generation — daily at 6am (checks per-tenant day)
    cron.schedule("0 6 * * *", async () => {
      const result = await executeJob(
        "wage-cycle-auto",
        runWageCycleAutoGeneration,
      );
      console.log("[Job]", result.job, result.result);
    });

    console.log("[Scheduler] All 4 cron jobs registered");
  } catch {
    console.log("[Scheduler] node-cron not available, skipping job scheduler");
  }
}

export {
  runOverdueDetection,
  runCreditDueApproaching,
  runFraudDetectionScan,
  runWageCycleAutoGeneration,
};
