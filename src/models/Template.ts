import mongoose, { Schema, Document } from "mongoose";

export interface ITemplate extends Document {
  templateId: string;
  name: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  logo?: string;
  headerStyle: "default" | "split-bar" | "inline-logo";
  showB1Button: boolean;
  showInfoBox: boolean;
  infoBoxLabel: string;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    primary: { type: String, required: true },
    primaryDark: { type: String, required: true },
    primaryLight: { type: String, required: true },
    logo: { type: String },
    headerStyle: {
      type: String,
      enum: ["default", "split-bar", "inline-logo"],
      default: "default",
    },
    showB1Button: { type: Boolean, default: false },
    showInfoBox: { type: Boolean, default: false },
    infoBoxLabel: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Template ||
  mongoose.model<ITemplate>("Template", TemplateSchema);
