import mongoose, { Schema, Document, Model } from "mongoose";

export const COLLECTION_EVENT_TYPES = [
  "page_view",
  "document_click",
  "search_query",
  "tag_filter",
  "chat_open",
  "chat_message",
  "chat_suggestion_click",
] as const;

export type CollectionEventType = (typeof COLLECTION_EVENT_TYPES)[number];

export interface ICollectionEvent extends Document {
  _id: mongoose.Types.ObjectId;
  collectionId: mongoose.Types.ObjectId;
  sessionId: string;
  eventType: CollectionEventType;
  metadata: {
    documentShortId?: string;
    documentTitle?: string;
    searchQuery?: string;
    tag?: string;
    question?: string;
    device?: "desktop" | "tablet" | "mobile";
    browser?: string;
    os?: string;
    referrer?: string;
    country?: string;
    city?: string;
  };
  timestamp: Date;
}

const CollectionEventSchema = new Schema<ICollectionEvent>(
  {
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
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
      enum: COLLECTION_EVENT_TYPES,
      index: true,
    },
    metadata: {
      documentShortId: { type: String },
      documentTitle: { type: String },
      searchQuery: { type: String },
      tag: { type: String },
      question: { type: String },
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
  { timestamps: false }
);

CollectionEventSchema.index({ collectionId: 1, eventType: 1, timestamp: -1 });
CollectionEventSchema.index({ collectionId: 1, timestamp: -1 });
CollectionEventSchema.index({ collectionId: 1, sessionId: 1 });

const CollectionEvent: Model<ICollectionEvent> =
  mongoose.models.CollectionEvent ||
  mongoose.model<ICollectionEvent>("CollectionEvent", CollectionEventSchema);

export default CollectionEvent;
