import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAssetEvent extends Document {
  tenant: Types.ObjectId;
  asset: Types.ObjectId;
  eventType: "status_change" | "value_update" | "created";
  previousValue?: string;
  newValue?: string;
  createdAt: Date;
}

const assetEventSchema = new Schema<IAssetEvent>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    asset: { type: Schema.Types.ObjectId, ref: "Asset", required: true },
    eventType: {
      type: String,
      enum: ["status_change", "value_update", "created"],
      required: true,
    },
    previousValue: { type: String },
    newValue: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IAssetEvent>("AssetEvent", assetEventSchema);
