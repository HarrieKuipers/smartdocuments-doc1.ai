import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICollection extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  organizationId: mongoose.Types.ObjectId;
  coverImage?: string;
  documentCount: number;
  access: {
    type: "public" | "password";
    password?: string;
  };
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
    documentCount: { type: Number, default: 0 },
    access: {
      type: {
        type: String,
        enum: ["public", "password"],
        default: "public",
      },
      password: { type: String },
    },
  },
  { timestamps: true }
);

const Collection: Model<ICollection> =
  mongoose.models.Collection ||
  mongoose.model<ICollection>("Collection", CollectionSchema);

export default Collection;
