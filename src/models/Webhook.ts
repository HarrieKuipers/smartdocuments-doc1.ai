import mongoose, { Schema, Document, Model } from "mongoose";

export const WEBHOOK_EVENTS = [
  "document.processed",
  "document.published",
  "document.error",
  "chat.message",
  "analytics.milestone",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export interface IWebhook extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  description: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      enum: WEBHOOK_EVENTS,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

WebhookSchema.index({ organizationId: 1, isActive: 1 });
WebhookSchema.index({ organizationId: 1, events: 1 });

const Webhook: Model<IWebhook> =
  mongoose.models.Webhook ||
  mongoose.model<IWebhook>("Webhook", WebhookSchema);

export default Webhook;
