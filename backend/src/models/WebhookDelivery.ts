import mongoose, { Schema, Document, Types } from "mongoose";

export type WebhookDeliveryStatus = "pending" | "success" | "failed" | "exhausted";

export interface IWebhookDelivery extends Document {
  tenant: Types.ObjectId;
  webhook: Types.ObjectId;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  lastResponseStatus?: number;
  lastErrorMessage?: string;
  createdAt: Date;
}

const webhookDeliverySchema = new Schema<IWebhookDelivery>({
  tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  webhook: { type: Schema.Types.ObjectId, ref: "Webhook", required: true, index: true },
  eventType: { type: String, required: true },
  payload: { type: Schema.Types.Mixed, required: true },
  status: {
    type: String,
    enum: ["pending", "success", "failed", "exhausted"],
    default: "pending",
    index: true,
  },
  attemptCount: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
  nextRetryAt: { type: Date, index: true },
  lastResponseStatus: { type: Number },
  lastErrorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IWebhookDelivery>("WebhookDelivery", webhookDeliverySchema);
