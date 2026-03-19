import mongoose, { Schema, Document as MongoDocument, Model } from "mongoose";

export const DISCUSSION_CATEGORIES = [
  "vraag",
  "feedback",
  "idee",
  "discussie",
] as const;
export type DiscussionCategory = (typeof DISCUSSION_CATEGORIES)[number];

export interface IDiscussion extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  title: string;
  content: string;
  category: DiscussionCategory;
  referencedSection?: {
    sectionType: "summary" | "keyPoint" | "finding" | "term";
    sectionIndex?: number;
    quote?: string;
  };
  upvotes: number;
  upvotedBy: mongoose.Types.ObjectId[];
  replyCount: number;
  isPinned: boolean;
  isClosed: boolean;
  isResolved: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionSchema = new Schema<IDiscussion>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 5000 },
    category: {
      type: String,
      enum: DISCUSSION_CATEGORIES,
      default: "discussie",
    },
    referencedSection: {
      sectionType: {
        type: String,
        enum: ["summary", "keyPoint", "finding", "term"],
      },
      sectionIndex: { type: Number },
      quote: { type: String, maxlength: 500 },
    },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    replyCount: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isClosed: { type: Boolean, default: false },
    isResolved: { type: Boolean, default: false },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DiscussionSchema.index({ documentId: 1, lastActivityAt: -1 });
DiscussionSchema.index({ documentId: 1, isPinned: -1, lastActivityAt: -1 });
DiscussionSchema.index({ documentId: 1, category: 1 });
DiscussionSchema.index({ authorId: 1 });

const Discussion: Model<IDiscussion> =
  mongoose.models.Discussion ||
  mongoose.model<IDiscussion>("Discussion", DiscussionSchema);

export default Discussion;
