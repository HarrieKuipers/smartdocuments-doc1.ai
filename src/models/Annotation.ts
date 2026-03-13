import mongoose, { Schema, Document as MongoDocument, Model } from "mongoose";

export const ANNOTATION_SECTION_TYPES = [
  "summary",
  "keyPoint",
  "finding",
  "term",
] as const;
export type AnnotationSectionType = (typeof ANNOTATION_SECTION_TYPES)[number];

export interface IAnnotation extends MongoDocument {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  sectionType: AnnotationSectionType;
  sectionIndex?: number;
  userId?: mongoose.Types.ObjectId;
  authorName: string;
  authorType: "team" | "public";
  sessionId?: string;
  content: string;
  parentId?: mongoose.Types.ObjectId;
  resolved: boolean;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnotationSchema = new Schema<IAnnotation>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    sectionType: {
      type: String,
      enum: ANNOTATION_SECTION_TYPES,
      required: true,
    },
    sectionIndex: { type: Number },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String, required: true },
    authorType: {
      type: String,
      enum: ["team", "public"],
      required: true,
    },
    sessionId: { type: String },
    content: { type: String, required: true, maxlength: 2000 },
    parentId: { type: Schema.Types.ObjectId, ref: "Annotation" },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

AnnotationSchema.index({
  documentId: 1,
  sectionType: 1,
  sectionIndex: 1,
  createdAt: 1,
});
AnnotationSchema.index({ documentId: 1, authorType: 1 });
AnnotationSchema.index({ parentId: 1 });

const Annotation: Model<IAnnotation> =
  mongoose.models.Annotation ||
  mongoose.model<IAnnotation>("Annotation", AnnotationSchema);

export default Annotation;
