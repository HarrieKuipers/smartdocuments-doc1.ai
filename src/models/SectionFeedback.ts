import mongoose, { Schema, Document, Model } from "mongoose";

export const SECTION_TYPES = [
  "summary",
  "keyPoint",
  "finding",
  "term",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const FEEDBACK_TYPES = [
  "unclear",
  "helpful",
  "incorrect",
  "too-complex",
  "too-simple",
] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export interface ISectionFeedback extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  sectionType: SectionType;
  sectionIndex?: number;
  sectionTitle?: string;
  feedbackType: FeedbackType;
  comment?: string;
  sessionId: string;
  createdAt: Date;
}

const SectionFeedbackSchema = new Schema<ISectionFeedback>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    sectionType: {
      type: String,
      required: true,
      enum: SECTION_TYPES,
      index: true,
    },
    sectionIndex: {
      type: Number,
    },
    sectionTitle: {
      type: String,
    },
    feedbackType: {
      type: String,
      required: true,
      enum: FEEDBACK_TYPES,
    },
    comment: {
      type: String,
      maxlength: 1000,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes for common queries
SectionFeedbackSchema.index({ documentId: 1, sectionType: 1 });
SectionFeedbackSchema.index({ documentId: 1, sessionId: 1, createdAt: -1 });

// TTL index: auto-delete after 180 days
SectionFeedbackSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

const SectionFeedback: Model<ISectionFeedback> =
  mongoose.models.SectionFeedback ||
  mongoose.model<ISectionFeedback>("SectionFeedback", SectionFeedbackSchema);

export default SectionFeedback;
