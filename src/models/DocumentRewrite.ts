import mongoose, { Schema, Document, Model } from "mongoose";
import type { IDocumentRewrite, DocumentRewriteStatus } from "@/types/rewrite";

export interface IDocumentRewriteDocument
  extends Omit<IDocumentRewrite, "_id">,
    Document {}

const ContentDiffSchema = new Schema(
  {
    sectionId: { type: String, required: true },
    sectionTitle: { type: String, required: true },
    original: { type: String, required: true },
    rewritten: { type: String, required: true },
    changesCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const RewriteVersionSchema = new Schema(
  {
    versionNumber: { type: Number, required: true },
    content: { type: String, default: "" },
    originalContent: { type: String, default: "" },
    diffs: [ContentDiffSchema],
    b1Score: { type: Number, default: 0 },
    rulesApplied: [{ type: Number }],
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StatusChangeSchema = new Schema(
  {
    from: { type: String },
    to: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: {
      type: String,
      enum: ["user", "client", "system"],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String },
  },
  { _id: false }
);

const REWRITE_STATUSES: DocumentRewriteStatus[] = [
  "draft",
  "processing",
  "rewritten",
  "shared_for_review",
  "in_review",
  "feedback_received",
  "approved",
  "approved_with_changes",
  "needs_revision",
  "editing",
  "published",
];

const DocumentRewriteSchema = new Schema<IDocumentRewriteDocument>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    schrijfwijzerId: {
      type: Schema.Types.ObjectId,
      ref: "Schrijfwijzer",
      required: true,
    },
    selectedRules: [{ type: Number }],
    preset: { type: String },
    versions: [RewriteVersionSchema],
    activeVersionNumber: { type: Number, default: 1 },
    status: {
      type: String,
      enum: REWRITE_STATUSES,
      default: "draft",
    },
    statusHistory: [StatusChangeSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

DocumentRewriteSchema.index({ documentId: 1, createdAt: -1 });
DocumentRewriteSchema.index({ organizationId: 1, status: 1 });

const DocumentRewrite: Model<IDocumentRewriteDocument> =
  mongoose.models.DocumentRewrite ||
  mongoose.model<IDocumentRewriteDocument>(
    "DocumentRewrite",
    DocumentRewriteSchema
  );

export default DocumentRewrite;
