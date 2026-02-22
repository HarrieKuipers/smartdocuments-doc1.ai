import { Types } from "mongoose";

export type SchrijfwijzerCategory =
  | "voorbereiding"
  | "structuur"
  | "zinnen"
  | "woorden";

export interface SchrijfwijzerRule {
  number: number;
  category: SchrijfwijzerCategory;
  title: string;
  description: string;
  mcpTools: string[];
  exampleBefore?: string;
  exampleAfter?: string;
  weight: number; // Impact on B1 score (1-3)
}

export interface ISchrijfwijzer {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  description?: string;
  rules: SchrijfwijzerRule[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mapping schrijfwijzer rules to MCP tools
export const SCHRIJFWIJZER_TOOL_MAP: Record<number, string[]> = {
  9: ["check_zinslengte"], // Korte zinnen
  10: ["check_passief_taalgebruik"], // Actieve zinnen
  11: ["check_tangconstructies"], // Geen tangconstructies
  12: ["check_dubbele_ontkenning"], // Geen dubbele ontkenningen
  13: [], // Concrete woorden - AI only
  14: ["check_nominalisaties"], // Geen nominalisaties
  15: ["check_moeilijke_woorden"], // Alledaagse woorden
  16: ["check_jargon"], // Geen vaktaal
  17: ["check_formele_woorden"], // Geen formele woorden
};

// Category labels (Dutch UI)
export const CATEGORY_LABELS: Record<SchrijfwijzerCategory, string> = {
  voorbereiding: "Voorbereiding",
  structuur: "Structuur",
  zinnen: "Zinnen",
  woorden: "Woorden",
};
