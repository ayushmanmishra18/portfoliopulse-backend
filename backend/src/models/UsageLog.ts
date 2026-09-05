import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUsageLog extends Document {
  tenant: Types.ObjectId;
  apiKey: Types.ObjectId;
  endpoint: string;
  method: string;
  statusCode: number;
  createdAt: Date;
}

const usageLogSchema = new Schema<IUsageLog>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    apiKey: { type: Schema.Types.ObjectId, ref: "ApiKey", required: true },
    endpoint: { type: String, required: true },
    method: { type: String, required: true },
    statusCode: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUsageLog>("UsageLog", usageLogSchema);
