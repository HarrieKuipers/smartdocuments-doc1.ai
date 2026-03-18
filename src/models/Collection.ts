import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICollection extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  coverImage?: string;
  template?: string;
  documentCount: number;
  access: {
    type: "public" | "password";
    password?: string;
  };
  chatIntro?: string;
  chatPlaceholder?: string;
  chatSuggestions?: string[];
  chatSuggestionsCache?: {
    question: string;
    answer: string;
    sourceDocuments?: { shortId: string; title: string }[];
    generatedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    coverImage: { type: String },
    template: { type: String },
    documentCount: { type: Number, default: 0 },
    access: {
      type: {
        type: String,
        enum: ["public", "password"],
        default: "public",
      },
      password: { type: String },
    },
    chatIntro: { type: String },
    chatPlaceholder: { type: String },
    chatSuggestions: [{ type: String }],
    chatSuggestionsCache: [
      {
        question: { type: String, required: true },
        answer: { type: String, required: true },
        sourceDocuments: [
          {
            shortId: { type: String },
            title: { type: String },
          },
        ],
        generatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Collection: Model<ICollection> =
  mongoose.models.Collection ||
  mongoose.model<ICollection>("Collection", CollectionSchema);

export default Collection;
