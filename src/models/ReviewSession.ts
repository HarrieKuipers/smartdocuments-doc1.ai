import mongoose, { Schema, Document, Model } from "mongoose";
import type { IReviewSession, ReviewStatus } from "@/types/review";

export interface IReviewSessionDocument
  extends Omit<IReviewSession, "_id">,
    Document {}

const SectionFeedbackSchema = new Schema(
  {
    id: { type: String, required: true },
    sectionId: { type: String, required: true },
    sectionTitle: { type: String, required: true },
    comment: { type: String, required: true },
    type: {
      type: String,
      enum: ["general", "language", "content", "structure"],
      default: "general",
    },
    createdAt: { type: Date, default: Date.now },
    author: { type: String, required: true },
  },
  { _id: false }
);

const REVIEW_STATUSES: ReviewStatus[] = [
  "pending",
  "in_progress",
  "approved",
  "approved_with_changes",
  "rejected",
];

const ReviewSessionSchema = new Schema<IReviewSessionDocument>(
  {
    rewriteId: {
      type: Schema.Types.ObjectId,
      ref: "DocumentRewrite",
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    versionNumber: { type: Number, required: true },
    token: { type: String, required: true, unique: true, index: true },
    pin: { type: String },
    reviewerName: { type: String },
    reviewerEmail: { type: String },
    status: {
      type: String,
      enum: REVIEW_STATUSES,
      default: "pending",
    },
    feedback: [SectionFeedbackSchema],
    generalFeedback: { type: String },
    openedAt: { type: Date },
    submittedAt: { type: Date },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

ReviewSessionSchema.index({ rewriteId: 1, createdAt: -1 });

const ReviewSession: Model<IReviewSessionDocument> =
  mongoose.models.ReviewSession ||
  mongoose.model<IReviewSessionDocument>(
    "ReviewSession",
    ReviewSessionSchema
  );

export default ReviewSession;
