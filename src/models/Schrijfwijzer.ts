import mongoose, { Schema, Document, Model } from "mongoose";
import type { ISchrijfwijzer, SchrijfwijzerCategory } from "@/types/schrijfwijzer";

export interface ISchrijfwijzerDocument
  extends Omit<ISchrijfwijzer, "_id">,
    Document {}

const CATEGORIES: SchrijfwijzerCategory[] = [
  "voorbereiding",
  "structuur",
  "zinnen",
  "woorden",
];

const SchrijfwijzerRuleSchema = new Schema(
  {
    number: { type: Number, required: true },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    mcpTools: [{ type: String }],
    exampleBefore: { type: String },
    exampleAfter: { type: String },
    weight: { type: Number, default: 1, min: 1, max: 3 },
  },
  { _id: false }
);

const SchrijfwijzerSchema = new Schema<ISchrijfwijzerDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    rules: [SchrijfwijzerRuleSchema],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

SchrijfwijzerSchema.index({ organizationId: 1, isDefault: 1 });

const Schrijfwijzer: Model<ISchrijfwijzerDocument> =
  mongoose.models.Schrijfwijzer ||
  mongoose.model<ISchrijfwijzerDocument>("Schrijfwijzer", SchrijfwijzerSchema);

export default Schrijfwijzer;
