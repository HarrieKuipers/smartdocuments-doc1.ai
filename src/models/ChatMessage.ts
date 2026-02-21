import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatMessage extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  sessionId: string;
  messages: {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }[];
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    sessionId: { type: String, required: true, index: true },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ documentId: 1, createdAt: -1 });

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage ||
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

export default ChatMessage;
