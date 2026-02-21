import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash?: string;
  image?: string;
  provider: "credentials" | "google";
  organizationId?: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "editor" | "viewer";
  stripeCustomerId?: string;
  plan: "free" | "pro" | "enterprise";
  documentsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    image: { type: String },
    provider: {
      type: String,
      enum: ["credentials", "google"],
      default: "credentials",
    },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
    role: {
      type: String,
      enum: ["owner", "admin", "editor", "viewer"],
      default: "owner",
    },
    stripeCustomerId: { type: String },
    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },
    documentsUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
