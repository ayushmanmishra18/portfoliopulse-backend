import cron from "node-cron";
import Tenant from "../models/Tenant";

const isNewCalendarMonth = (lastReset: Date, now: Date): boolean =>
  lastReset.getFullYear() !== now.getFullYear() || lastReset.getMonth() !== now.getMonth();

/**
 * Runs once daily. Resets each tenant's monthly API usage counter the first
 * time this job runs after the calendar month has rolled over.
 */
export const startQuotaResetJob = (): void => {
  cron.schedule("0 0 * * *", async () => {
    const now = new Date();
    const tenants = await Tenant.find({});

    for (const tenant of tenants) {
      if (isNewCalendarMonth(tenant.lastQuotaResetAt, now)) {
        tenant.apiRequestsUsedThisMonth = 0;
        tenant.lastQuotaResetAt = now;
        await tenant.save();
      }
    }
  });
};
