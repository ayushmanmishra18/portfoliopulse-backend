import mongoose, { Schema, Document } from "mongoose";
import { nanoid } from "nanoid";

export interface ITenant extends Document {
  name: string;
  slug: string;
  plan: "free" | "pro" | "enterprise";
  apiRequestQuota: number;
  apiRequestsUsedThisMonth: number;
  lastQuotaResetAt: Date;
  createdAt: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      default: () => nanoid(10),
    },
    plan: { type: String, enum: ["free", "pro", "enterprise"], default: "free" },
    apiRequestQuota: { type: Number, default: 1000 }, // monthly quota by plan
    apiRequestsUsedThisMonth: { type: Number, default: 0 },
    lastQuotaResetAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model<ITenant>("Tenant", tenantSchema);
