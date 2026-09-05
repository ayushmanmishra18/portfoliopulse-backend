import mongoose, { Schema, Document, Types } from "mongoose";
import crypto from "crypto";

export interface IApiKey extends Document {
  tenant: Types.ObjectId;
  name: string;
  keyPrefix: string; // shown to user, e.g. "pp_live_ab12"
  hashedKey: string; // sha256 hash of the full secret key
  lastUsedAt?: Date;
  revoked: boolean;
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    name: { type: String, required: true, trim: true },
    keyPrefix: { type: String, required: true },
    hashedKey: { type: String, required: true },
    lastUsedAt: { type: Date },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Utility: generate a new raw API key + its hash, used at creation time only.
// The raw key is returned once to the user and never stored in plaintext.
export const generateApiKey = (): { rawKey: string; prefix: string; hashedKey: string } => {
  const secret = crypto.randomBytes(24).toString("hex");
  const prefix = `pp_live_${secret.slice(0, 8)}`;
  const rawKey = `${prefix}_${secret}`;
  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, prefix, hashedKey };
};

export const hashApiKey = (rawKey: string): string => {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
};

export default mongoose.model<IApiKey>("ApiKey", apiKeySchema);
