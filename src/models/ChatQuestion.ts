import mongoose, { Schema, Document, Model } from "mongoose";

export const QUESTION_CATEGORIES = [
  "definition",
  "explanation",
  "comparison",
  "procedure",
  "factual",
  "opinion",
  "application",
  "clarification",
  "summary",
  "other",
] as const;

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number];

export interface IChatQuestion extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  sessionId: string;
  question: string;
  answer?: string;
  category?: QuestionCategory;
  sourceSections: {
    sectionId: string;
    sectionTitle: string;
    relevanceScore: number;
  }[];
  mentionedTerms: string[];
  feedback: {
    type: "positive" | "negative" | null;
    comment?: string;
    timestamp?: Date;
  };
  responseTimeMs?: number;
  tokensUsed?: number;
  aiModel?: string;
  timestamp: Date;
}

const ChatQuestionSchema = new Schema<IChatQuestion>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    sessionId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String },
    category: {
      type: String,
      enum: QUESTION_CATEGORIES,
    },
    sourceSections: [
      {
        sectionId: { type: String },
        sectionTitle: { type: String },
        relevanceScore: { type: Number },
      },
    ],
    mentionedTerms: [{ type: String }],
    feedback: {
      type: {
        type: String,
        enum: ["positive", "negative", null],
        default: null,
      },
      comment: { type: String },
      timestamp: { type: Date },
    },
    responseTimeMs: { type: Number },
    tokensUsed: { type: Number },
    aiModel: { type: String },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

ChatQuestionSchema.index({ documentId: 1, timestamp: -1 });
ChatQuestionSchema.index({ documentId: 1, category: 1 });
ChatQuestionSchema.index({ question: "text" });

const ChatQuestion: Model<IChatQuestion> =
  mongoose.models.ChatQuestion ||
  mongoose.model<IChatQuestion>("ChatQuestion", ChatQuestionSchema);

export default ChatQuestion;
