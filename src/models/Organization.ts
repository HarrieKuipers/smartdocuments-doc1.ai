import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  logo?: string;
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  defaultLanguageLevel: "B1" | "B2" | "C1";
  ownerId: mongoose.Types.ObjectId;
  members: {
    userId: mongoose.Types.ObjectId;
    role: string;
    addedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    logo: { type: String },
    brandColors: {
      primary: { type: String, default: "#00BCD4" },
      secondary: { type: String, default: "#00838F" },
      accent: { type: String, default: "#E0F7FA" },
    },
    defaultLanguageLevel: {
      type: String,
      enum: ["B1", "B2", "C1"],
      default: "B2",
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        role: { type: String },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Organization: Model<IOrganization> =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);

export default Organization;
