import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAsset extends Document {
  tenant: Types.ObjectId;
  name: string;
  type: "loan" | "equity" | "real_estate" | "other";
  principalAmount: number;
  currentValue: number;
  status: "performing" | "watchlist" | "default" | "closed";
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["loan", "equity", "real_estate", "other"],
      default: "loan",
    },
    principalAmount: { type: Number, required: true, min: 0 },
    currentValue: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["performing", "watchlist", "default", "closed"],
      default: "performing",
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<IAsset>("Asset", assetSchema);
