import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWebhook extends Document {
  tenant: Types.ObjectId;
  url: string;
  events: string[]; // e.g. ["status_change", "value_update"]
  secret: string; // used to sign payloads (HMAC) so receivers can verify authenticity
  active: boolean;
  createdAt: Date;
}

const webhookSchema = new Schema<IWebhook>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    url: { type: String, required: true },
    events: { type: [String], default: ["status_change", "value_update", "created"] },
    secret: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IWebhook>("Webhook", webhookSchema);
