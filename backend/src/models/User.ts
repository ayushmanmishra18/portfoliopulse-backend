import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { TenantRole } from "../types";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  tenant: Types.ObjectId;
  role: TenantRole;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    tenant: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    role: { type: String, enum: ["owner", "admin", "viewer"], default: "viewer" },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
