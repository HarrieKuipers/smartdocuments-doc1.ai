import mongoose, { Schema, Document, Model } from "mongoose";

export const API_KEY_SCOPES = [
  "read:documents",
  "write:documents",
  "read:collections",
  "write:collections",
  "read:analytics",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export interface IApiKey extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    scopes: {
      type: [String],
      enum: API_KEY_SCOPES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

ApiKeySchema.index({ organizationId: 1, isActive: 1 });

const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

export default ApiKey;
