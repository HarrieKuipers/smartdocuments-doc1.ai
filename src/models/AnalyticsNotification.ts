import mongoose, { Document as MongoDocument } from "mongoose";

export interface IAnalyticsNotification extends MongoDocument {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  documentId?: mongoose.Types.ObjectId;
  type:
    | "milestone"
    | "activity_spike"
    | "negative_feedback"
    | "weekly_digest"
    | "achievement";
  title: string;
  message: string;
  metadata?: {
    documentTitle?: string;
    metric?: string;
    currentValue?: number;
    threshold?: number;
  };
  read: boolean;
  emailSent: boolean;
  createdAt: Date;
}

const analyticsNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "milestone",
        "activity_spike",
        "negative_feedback",
        "weekly_digest",
        "achievement",
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    metadata: {
      documentTitle: String,
      metric: String,
      currentValue: Number,
      threshold: Number,
    },
    read: { type: Boolean, default: false },
    emailSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

analyticsNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
analyticsNotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90 day TTL

export default mongoose.models.AnalyticsNotification ||
  mongoose.model<IAnalyticsNotification>(
    "AnalyticsNotification",
    analyticsNotificationSchema
  );
