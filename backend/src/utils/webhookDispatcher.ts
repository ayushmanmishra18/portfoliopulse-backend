import crypto from "crypto";
import axios from "axios";
import Webhook, { IWebhook } from "../models/Webhook";
import WebhookDelivery, { IWebhookDelivery } from "../models/WebhookDelivery";

const RETRY_BACKOFF_MINUTES = [1, 5, 30]; // delay before attempt 2, 3, 4
const MAX_ATTEMPTS = RETRY_BACKOFF_MINUTES.length + 1;

const signPayload = (secret: string, body: string): string =>
  crypto.createHmac("sha256", secret).update(body).digest("hex");

/**
 * Sends one webhook attempt and records the outcome on the delivery record.
 * Attempt count is incremented before sending so backoff/exhaustion math is
 * based on the attempt that's about to happen.
 */
const attemptDelivery = async (
  webhook: IWebhook,
  delivery: IWebhookDelivery
): Promise<void> => {
  const body = JSON.stringify({
    eventType: delivery.eventType,
    data: delivery.payload,
    timestamp: Date.now(),
  });
  const signature = signPayload(webhook.secret, body);

  delivery.attemptCount += 1;
  delivery.lastAttemptAt = new Date();

  try {
    const response = await axios.post(webhook.url, body, {
      headers: {
        "Content-Type": "application/json",
        "X-PortfolioPulse-Signature": signature,
      },
      timeout: 5000,
    });
    delivery.status = "success";
    delivery.lastResponseStatus = response.status;
    delivery.lastErrorMessage = undefined;
    delivery.nextRetryAt = undefined;
  } catch (error: any) {
    delivery.lastResponseStatus = error.response?.status;
    delivery.lastErrorMessage = error.message || "Webhook delivery failed";

    if (delivery.attemptCount >= MAX_ATTEMPTS) {
      delivery.status = "exhausted";
      delivery.nextRetryAt = undefined;
    } else {
      delivery.status = "pending";
      const delayMinutes = RETRY_BACKOFF_MINUTES[delivery.attemptCount - 1];
      delivery.nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    }
  }

  await delivery.save();
};

/**
 * Dispatches an event to all active webhooks a tenant has registered for
 * that event type. Each webhook gets a WebhookDelivery record tracking the
 * attempt; failures are retried on a backoff schedule by webhookRetryJob
 * rather than fire-and-forget with no visibility.
 */
export const dispatchWebhookEvent = async (
  tenantId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> => {
  try {
    const webhooks = await Webhook.find({
      tenant: tenantId,
      active: true,
      events: eventType,
    });

    for (const webhook of webhooks) {
      const delivery = await WebhookDelivery.create({
        tenant: tenantId,
        webhook: webhook._id,
        eventType,
        payload,
        status: "pending",
      });
      // fire-and-forget: don't let dispatch delay the request that triggered it
      attemptDelivery(webhook, delivery).catch((err) =>
        console.error("Webhook delivery attempt error:", err)
      );
    }
  } catch (error) {
    console.error("Webhook dispatch error:", error);
  }
};

/**
 * Retries one delivery immediately, regardless of nextRetryAt. Used by both
 * the retry cron job and the manual resend endpoint.
 */
export const retryDelivery = async (delivery: IWebhookDelivery): Promise<void> => {
  const webhook = await Webhook.findById(delivery.webhook);
  if (!webhook) {
    delivery.status = "exhausted";
    delivery.lastErrorMessage = "Webhook no longer exists";
    await delivery.save();
    return;
  }
  await attemptDelivery(webhook, delivery);
};
