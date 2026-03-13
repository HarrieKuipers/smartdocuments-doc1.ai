import mongoose, { Schema, Document as MongoDocument, Model } from "mongoose";

export interface IDocumentVersion extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  versionNumber: number;
  versionLabel?: string;
  sourceFile: {
    url: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date;
  };
  content: {
    originalText: string;
    summary: {
      original: string;
      B1: string;
      B2: string;
      C1: string;
    };
    keyPoints: { text: string; explanation?: string; linkedTerms: string[] }[];
    findings: { category: string; title: string; content: string }[];
    terms: { term: string; definition: string; occurrences: number }[];
  };
  pageCount?: number;
  languageLevel?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    versionNumber: { type: Number, required: true },
    versionLabel: { type: String },
    sourceFile: {
      url: { type: String },
      filename: { type: String },
      mimeType: { type: String },
      sizeBytes: { type: Number },
      uploadedAt: { type: Date },
    },
    content: {
      originalText: { type: String, default: "" },
      summary: {
        original: { type: String, default: "" },
        B1: { type: String, default: "" },
        B2: { type: String, default: "" },
        C1: { type: String, default: "" },
      },
      keyPoints: [
        {
          text: { type: String },
          explanation: { type: String },
          linkedTerms: [{ type: String }],
        },
      ],
      findings: [
        {
          category: { type: String },
          title: { type: String },
          content: { type: String },
        },
      ],
      terms: [
        {
          term: { type: String },
          definition: { type: String },
          occurrences: { type: Number },
        },
      ],
    },
    pageCount: { type: Number },
    languageLevel: { type: String },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DocumentVersionSchema.index({ documentId: 1, versionNumber: -1 });

const DocumentVersion: Model<IDocumentVersion> =
  mongoose.models.DocumentVersion ||
  mongoose.model<IDocumentVersion>("DocumentVersion", DocumentVersionSchema);

export default DocumentVersion;
