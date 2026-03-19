import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWebhookDelivery extends Document {
  _id: mongoose.Types.ObjectId;
  webhookId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  event: string;
  payload: Record<string, unknown>;
  status: "pending" | "success" | "failed";
  httpStatus: number | null;
  responseBody: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  error: string | null;
  duration: number | null;
  createdAt: Date;
}

const WebhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: "Webhook",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    httpStatus: {
      type: Number,
      default: null,
    },
    responseBody: {
      type: String,
      default: "",
      maxlength: 1024,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

WebhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
WebhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });
WebhookDeliverySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

const WebhookDelivery: Model<IWebhookDelivery> =
  mongoose.models.WebhookDelivery ||
  mongoose.model<IWebhookDelivery>("WebhookDelivery", WebhookDeliverySchema);

export default WebhookDelivery;
