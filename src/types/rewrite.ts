import { Types } from "mongoose";

// Document rewrite status machine
export type DocumentRewriteStatus =
  | "draft"
  | "processing"
  | "rewritten"
  | "shared_for_review"
  | "in_review"
  | "feedback_received"
  | "approved"
  | "approved_with_changes"
  | "needs_revision"
  | "editing"
  | "published";

// Status color mapping for UI badges
export const REWRITE_STATUS_COLORS: Record<DocumentRewriteStatus, string> = {
  draft: "gray",
  processing: "blue",
  rewritten: "blue",
  shared_for_review: "blue",
  in_review: "orange",
  feedback_received: "orange",
  approved: "green",
  approved_with_changes: "green",
  needs_revision: "red",
  editing: "orange",
  published: "green",
};

// Status labels (Dutch UI)
export const REWRITE_STATUS_LABELS: Record<DocumentRewriteStatus, string> = {
  draft: "Concept",
  processing: "Wordt verwerkt",
  rewritten: "Herschreven",
  shared_for_review: "Ter review gedeeld",
  in_review: "In review",
  feedback_received: "Feedback ontvangen",
  approved: "Akkoord",
  approved_with_changes: "Akkoord met aanpassingen",
  needs_revision: "Revisie nodig",
  editing: "Wordt bewerkt",
  published: "Gepubliceerd",
};

export interface ContentDiff {
  sectionId: string;
  sectionTitle: string;
  original: string;
  rewritten: string;
  changesCount: number;
}

export interface RewriteVersion {
  versionNumber: number;
  content: string; // HTML of rewritten document
  originalContent: string; // HTML of original (for diff)
  diffs: ContentDiff[];
  b1Score: number; // 0-100
  rulesApplied: number[]; // Which rules actually produced changes
  createdAt: Date;
}

export interface StatusChange {
  from: DocumentRewriteStatus;
  to: DocumentRewriteStatus;
  changedAt: Date;
  changedBy: "user" | "client" | "system";
  userId?: Types.ObjectId;
  note?: string;
}

export interface IDocumentRewrite {
  _id: Types.ObjectId;
  documentId: Types.ObjectId;
  organizationId: Types.ObjectId;

  // Schrijfwijzer configuration
  schrijfwijzerId: Types.ObjectId;
  selectedRules: number[];
  preset?: string;

  // Versions
  versions: RewriteVersion[];
  activeVersionNumber: number;

  // Status
  status: DocumentRewriteStatus;
  statusHistory: StatusChange[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
}

// Pipeline progress events (SSE)
export interface RewriteProgressEvent {
  step: string;
  percentage: number;
  message?: string;
  sectionId?: string;
}

// Presets
export interface RewritePreset {
  id: string;
  name: string;
  rules: number[];
}

export const REWRITE_PRESETS: RewritePreset[] = [
  {
    id: "light",
    name: "Lichte correctie",
    rules: [9, 10, 12, 15, 17],
  },
  {
    id: "full-b1",
    name: "Volledig B1",
    rules: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
  },
  {
    id: "structure-sentences",
    name: "Structuur & zinnen",
    rules: [5, 6, 7, 8, 9, 10, 11, 12],
  },
];

// Default selected rules
export const DEFAULT_SELECTED_RULES = [9, 10, 11, 12, 14, 15, 16, 17];
