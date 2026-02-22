import { Types } from "mongoose";

export type ReviewStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "approved_with_changes"
  | "rejected";

export type FeedbackType = "general" | "language" | "content" | "structure";

export interface SectionFeedback {
  id: string;
  sectionId: string;
  sectionTitle: string;
  comment: string;
  type: FeedbackType;
  createdAt: Date;
  author: string;
}

export interface IReviewSession {
  _id: Types.ObjectId;
  rewriteId: Types.ObjectId;
  documentId: Types.ObjectId;
  versionNumber: number;

  token: string; // UUID v4 for URL
  pin?: string; // bcrypt hash of pincode

  reviewerName?: string;
  reviewerEmail?: string;

  status: ReviewStatus;
  feedback: SectionFeedback[];
  generalFeedback?: string;

  openedAt?: Date;
  submittedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}
