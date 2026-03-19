import mongoose, { Schema, Document as MongoDocument, Model } from "mongoose";

export interface IDiscussionReply extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  discussionId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  content: string;
  parentReplyId?: mongoose.Types.ObjectId;
  upvotes: number;
  upvotedBy: mongoose.Types.ObjectId[];
  isDocumentOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DiscussionReplySchema = new Schema<IDiscussionReply>(
  {
    discussionId: {
      type: Schema.Types.ObjectId,
      ref: "Discussion",
      required: true,
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorName: { type: String, required: true },
    content: { type: String, required: true, maxlength: 3000 },
    parentReplyId: { type: Schema.Types.ObjectId, ref: "DiscussionReply" },
    upvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDocumentOwner: { type: Boolean, default: false },
  },
  { timestamps: true }
);

DiscussionReplySchema.index({ discussionId: 1, createdAt: 1 });
DiscussionReplySchema.index({ parentReplyId: 1 });
DiscussionReplySchema.index({ authorId: 1 });

const DiscussionReply: Model<IDiscussionReply> =
  mongoose.models.DiscussionReply ||
  mongoose.model<IDiscussionReply>("DiscussionReply", DiscussionReplySchema);

export default DiscussionReply;
