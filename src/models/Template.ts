import mongoose, { Schema, Document } from "mongoose";

export interface ITemplate extends Document {
  templateId: string;
  name: string;
  // Colors
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accentColor?: string;
  backgroundColor?: string;
  // Branding
  logo?: string;
  favicon?: string;
  // Typography
  fontHeading?: string;
  fontBody?: string;
  // Layout
  headerStyle: "default" | "split-bar" | "inline-logo";
  cornerRadius?: "none" | "small" | "medium" | "large";
  logoPosition?: "left" | "center" | "right";
  // Features
  showB1Button: boolean;
  showInfoBox: boolean;
  infoBoxLabel: string;
  showChatWidget: boolean;
  showTableOfContents: boolean;
  // Footer
  footerText?: string;
  footerLink?: string;
  // Meta
  isSystem: boolean;
  organizationId?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    templateId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    // Colors
    primary: { type: String, required: true },
    primaryDark: { type: String, required: true },
    primaryLight: { type: String, required: true },
    accentColor: { type: String },
    backgroundColor: { type: String },
    // Branding
    logo: { type: String },
    favicon: { type: String },
    // Typography
    fontHeading: { type: String },
    fontBody: { type: String },
    // Layout
    headerStyle: {
      type: String,
      enum: ["default", "split-bar", "inline-logo"],
      default: "default",
    },
    cornerRadius: {
      type: String,
      enum: ["none", "small", "medium", "large"],
      default: "medium",
    },
    logoPosition: {
      type: String,
      enum: ["left", "center", "right"],
      default: "center",
    },
    // Features
    showB1Button: { type: Boolean, default: false },
    showInfoBox: { type: Boolean, default: false },
    infoBoxLabel: { type: String, default: "" },
    showChatWidget: { type: Boolean, default: true },
    showTableOfContents: { type: Boolean, default: true },
    // Footer
    footerText: { type: String },
    footerLink: { type: String },
    // Meta
    isSystem: { type: Boolean, default: false },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization" },
  },
  { timestamps: true }
);

export default mongoose.models.Template ||
  mongoose.model<ITemplate>("Template", TemplateSchema);
