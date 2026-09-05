import cron from "node-cron";
import WebhookDelivery from "../models/WebhookDelivery";
import { retryDelivery } from "../utils/webhookDispatcher";

/**
 * Every minute, retries any pending webhook delivery whose backoff window
 * has elapsed. This is the app's own scheduler substituting for a queue.
 */
export const startWebhookRetryJob = (): void => {
  cron.schedule("* * * * *", async () => {
    const due = await WebhookDelivery.find({
      status: "pending",
      nextRetryAt: { $lte: new Date() },
    });

    for (const delivery of due) {
      await retryDelivery(delivery).catch((err) =>
        console.error("Webhook retry job error:", err)
      );
    }
  });
};
