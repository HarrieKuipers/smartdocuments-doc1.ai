import mongoose, { Schema, Document, Model } from "mongoose";
import { WEBHOOK_EVENTS, type WebhookEvent } from "./Webhook";

export const INTEGRATION_TYPES = ["slack", "teams", "notion"] as const;

export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export interface IIntegrationConfig {
  slackWebhookUrl?: string;
  slackChannel?: string;
  teamsWebhookUrl?: string;
  notionApiKey?: string;
  notionParentPageId?: string;
}

export interface IIntegration extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  type: IntegrationType;
  isActive: boolean;
  config: IIntegrationConfig;
  events: WebhookEvent[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema = new Schema<IIntegration>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    type: {
      type: String,
      enum: INTEGRATION_TYPES,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    config: {
      slackWebhookUrl: { type: String },
      slackChannel: { type: String },
      teamsWebhookUrl: { type: String },
      notionApiKey: { type: String },
      notionParentPageId: { type: String },
    },
    events: {
      type: [String],
      enum: WEBHOOK_EVENTS,
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

IntegrationSchema.index({ organizationId: 1, type: 1 }, { unique: true });

const Integration: Model<IIntegration> =
  mongoose.models.Integration ||
  mongoose.model<IIntegration>("Integration", IntegrationSchema);

export default Integration;
