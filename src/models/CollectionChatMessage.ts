import mongoose, { Schema, Document as MongoDocument, Model } from "mongoose";

export interface ICollectionChatMessage extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  collectionId: mongoose.Types.ObjectId;
  sessionId: string;
  messages: {
    role: "user" | "assistant";
    content: string;
    sourceDocuments?: {
      documentId: mongoose.Types.ObjectId;
      shortId: string;
      title: string;
    }[];
    timestamp: Date;
  }[];
  createdAt: Date;
}

const CollectionChatMessageSchema = new Schema<ICollectionChatMessage>(
  {
    collectionId: {
      type: Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
      index: true,
    },
    sessionId: { type: String, required: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        sourceDocuments: [
          {
            documentId: { type: Schema.Types.ObjectId, ref: "Document" },
            shortId: { type: String },
            title: { type: String },
          },
        ],
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CollectionChatMessageSchema.index({ collectionId: 1, sessionId: 1 });

const CollectionChatMessage: Model<ICollectionChatMessage> =
  mongoose.models.CollectionChatMessage ||
  mongoose.model<ICollectionChatMessage>(
    "CollectionChatMessage",
    CollectionChatMessageSchema
  );

export default CollectionChatMessage;
