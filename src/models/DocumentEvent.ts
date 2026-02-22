import mongoose, { Schema, Document, Model } from "mongoose";

export const EVENT_TYPES = [
  // Views
  "page_view",
  "section_view",
  "scroll_depth",
  // Engagement
  "time_on_page",
  "term_click",
  "link_click",
  "toc_click",
  "summary_expand",
  "summary_collapse",
  // AI Interaction
  "chat_message",
  "chat_response",
  "chat_feedback",
  "chat_copy",
  // Download & Share
  "pdf_download",
  "share_link_created",
  "share_link_clicked",
  "print",
  // Search
  "search_query",
  "search_result_click",
  // Navigation
  "language_switch",
  "reading_mode_toggle",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface IDocumentEvent extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  eventType: EventType;
  metadata: {
    sectionId?: string;
    sectionTitle?: string;
    scrollPercentage?: number;
    activeSeconds?: number;
    totalSeconds?: number;
    term?: string;
    termDefinition?: string;
    question?: string;
    questionCategory?: string;
    responseLength?: number;
    responseTime?: number;
    sourceSections?: string[];
    feedbackType?: "positive" | "negative";
    feedbackComment?: string;
    searchQuery?: string;
    resultsCount?: number;
    targetUrl?: string;
    targetSection?: string;
    device?: "desktop" | "tablet" | "mobile";
    browser?: string;
    os?: string;
    referrer?: string;
    country?: string;
    city?: string;
  };
  timestamp: Date;
}

const DocumentEventSchema = new Schema<IDocumentEvent>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: EVENT_TYPES,
      index: true,
    },
    metadata: {
      sectionId: { type: String },
      sectionTitle: { type: String },
      scrollPercentage: { type: Number },
      activeSeconds: { type: Number },
      totalSeconds: { type: Number },
      term: { type: String },
      termDefinition: { type: String },
      question: { type: String },
      questionCategory: { type: String },
      responseLength: { type: Number },
      responseTime: { type: Number },
      sourceSections: [{ type: String }],
      feedbackType: { type: String, enum: ["positive", "negative"] },
      feedbackComment: { type: String },
      searchQuery: { type: String },
      resultsCount: { type: Number },
      targetUrl: { type: String },
      targetSection: { type: String },
      device: { type: String, enum: ["desktop", "tablet", "mobile"] },
      browser: { type: String },
      os: { type: String },
      referrer: { type: String },
      country: { type: String },
      city: { type: String },
    },
    timestamp: {
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
DocumentEventSchema.index({ documentId: 1, eventType: 1, timestamp: -1 });
DocumentEventSchema.index({ documentId: 1, timestamp: -1 });
DocumentEventSchema.index({ documentId: 1, sessionId: 1, timestamp: -1 });
DocumentEventSchema.index({ userId: 1, timestamp: -1 });

const DocumentEvent: Model<IDocumentEvent> =
  mongoose.models.DocumentEvent ||
  mongoose.model<IDocumentEvent>("DocumentEvent", DocumentEventSchema);

export default DocumentEvent;
