import mongoose, { Schema, Document, Types } from "mongoose";

export interface ITestEndpointEvent extends Document {
  tenant: Types.ObjectId;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  receivedAt: Date;
}

const testEndpointEventSchema = new Schema<ITestEndpointEvent>({
  tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  headers: { type: Schema.Types.Mixed, default: {} },
  receivedAt: { type: Date, default: Date.now },
});

export default mongoose.model<ITestEndpointEvent>("TestEndpointEvent", testEndpointEventSchema);
