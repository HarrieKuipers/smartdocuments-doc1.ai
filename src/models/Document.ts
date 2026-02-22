import mongoose, { Schema, Document as MongoDocument, Model } from "mongoose";

export interface IDocument extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  shortId: string;
  slug: string;
  organizationId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  title: string;
  authors: string[];
  publicationDate?: Date;
  version?: string;
  tags: string[];
  description?: string;
  pageCount?: number;
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
    keyPoints: { text: string; linkedTerms: string[] }[];
    findings: { category: string; title: string; content: string }[];
    terms: { term: string; definition: string; occurrences: number }[];
  };
  access: {
    type: "public" | "link-only" | "password";
    password?: string;
  };
  template?: "doc1" | "rijksoverheid" | "amsterdam";
  chatMode?: "full" | "terms-only";
  brandOverride?: {
    primary?: string;
    logo?: string;
  };
  collectionId?: mongoose.Types.ObjectId;
  status: "uploading" | "processing" | "ready" | "error";
  processingProgress: {
    step: string;
    percentage: number;
  };
  analytics: {
    totalViews: number;
    uniqueViews: number;
    totalDownloads: number;
    averageReadTime: number;
    chatInteractions: number;
  };
  coverImageUrl?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    shortId: { type: String, required: true, unique: true, index: true },
    slug: { type: String, index: true },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, default: "Untitled Document" },
    authors: [{ type: String }],
    publicationDate: { type: Date },
    version: { type: String },
    tags: [{ type: String }],
    description: { type: String },
    pageCount: { type: Number },
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
    access: {
      type: {
        type: String,
        enum: ["public", "link-only", "password"],
        default: "public",
      },
      password: { type: String },
    },
    template: {
      type: String,
      enum: ["doc1", "rijksoverheid", "amsterdam"],
      default: "doc1",
    },
    chatMode: {
      type: String,
      enum: ["full", "terms-only"],
      default: "full",
    },
    brandOverride: {
      primary: { type: String },
      logo: { type: String },
    },
    collectionId: { type: Schema.Types.ObjectId, ref: "Collection" },
    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "error"],
      default: "uploading",
    },
    processingProgress: {
      step: { type: String, default: "text-extraction" },
      percentage: { type: Number, default: 0 },
    },
    analytics: {
      totalViews: { type: Number, default: 0 },
      uniqueViews: { type: Number, default: 0 },
      totalDownloads: { type: Number, default: 0 },
      averageReadTime: { type: Number, default: 0 },
      chatInteractions: { type: Number, default: 0 },
    },
    coverImageUrl: { type: String },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

DocumentSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
DocumentSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

const DocumentModel: Model<IDocument> =
  mongoose.models.Document ||
  mongoose.model<IDocument>("Document", DocumentSchema);

export default DocumentModel;
