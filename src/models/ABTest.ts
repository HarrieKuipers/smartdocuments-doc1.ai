import mongoose, { Document as MongoDocument } from "mongoose";

export interface IABTest extends MongoDocument {
  name: string;
  organizationId: mongoose.Types.ObjectId;
  documentA: mongoose.Types.ObjectId;
  documentB: mongoose.Types.ObjectId;
  status: "active" | "paused" | "completed";
  trafficSplit: number; // Percentage going to variant B (0-100)
  startDate: Date;
  endDate?: Date;
  winner?: "A" | "B" | null;
  goalMetric: "views" | "readTime" | "scrollDepth" | "completionRate" | "chatEngagement";
  createdAt: Date;
  updatedAt: Date;
}

const abTestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    documentA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    documentB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
    },
    trafficSplit: {
      type: Number,
      default: 50,
      min: 10,
      max: 90,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: Date,
    winner: {
      type: String,
      enum: ["A", "B", null],
      default: null,
    },
    goalMetric: {
      type: String,
      enum: [
        "views",
        "readTime",
        "scrollDepth",
        "completionRate",
        "chatEngagement",
      ],
      default: "completionRate",
    },
  },
  {
    timestamps: true,
  }
);

abTestSchema.index({ organizationId: 1, status: 1 });

export default mongoose.models.ABTest ||
  mongoose.model<IABTest>("ABTest", abTestSchema);
