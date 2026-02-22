import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDocumentAnalyticsSummary extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  date: Date;
  views: number;
  uniqueVisitors: number;
  downloads: number;
  prints: number;
  shares: number;
  avgReadTimeSeconds: number;
  medianReadTimeSeconds: number;
  bounceRate: number;
  avgScrollDepth: number;
  completionRate: number;
  chatSessions: number;
  chatMessages: number;
  chatPositiveFeedback: number;
  chatNegativeFeedback: number;
  avgResponseTime: number;
  termClicks: number;
  topTerms: { term: string; clicks: number }[];
  searchQueries: number;
  topSearchQueries: {
    query: string;
    count: number;
    avgResultsCount: number;
  }[];
  topSections: {
    sectionId: string;
    sectionTitle: string;
    views: number;
    avgTimeSeconds: number;
  }[];
  deviceBreakdown: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  topReferrers: { referrer: string; count: number }[];
  topCountries: { country: string; count: number }[];
  createdAt: Date;
  updatedAt: Date;
}

const DocumentAnalyticsSummarySchema =
  new Schema<IDocumentAnalyticsSummary>(
    {
      documentId: {
        type: Schema.Types.ObjectId,
        ref: "Document",
        required: true,
      },
      date: {
        type: Date,
        required: true,
      },
      views: { type: Number, default: 0 },
      uniqueVisitors: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      prints: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      avgReadTimeSeconds: { type: Number, default: 0 },
      medianReadTimeSeconds: { type: Number, default: 0 },
      bounceRate: { type: Number, default: 0 },
      avgScrollDepth: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      chatSessions: { type: Number, default: 0 },
      chatMessages: { type: Number, default: 0 },
      chatPositiveFeedback: { type: Number, default: 0 },
      chatNegativeFeedback: { type: Number, default: 0 },
      avgResponseTime: { type: Number, default: 0 },
      termClicks: { type: Number, default: 0 },
      topTerms: [
        {
          term: { type: String },
          clicks: { type: Number },
        },
      ],
      searchQueries: { type: Number, default: 0 },
      topSearchQueries: [
        {
          query: { type: String },
          count: { type: Number },
          avgResultsCount: { type: Number },
        },
      ],
      topSections: [
        {
          sectionId: { type: String },
          sectionTitle: { type: String },
          views: { type: Number },
          avgTimeSeconds: { type: Number },
        },
      ],
      deviceBreakdown: {
        desktop: { type: Number, default: 0 },
        tablet: { type: Number, default: 0 },
        mobile: { type: Number, default: 0 },
      },
      topReferrers: [
        {
          referrer: { type: String },
          count: { type: Number },
        },
      ],
      topCountries: [
        {
          country: { type: String },
          count: { type: Number },
        },
      ],
    },
    { timestamps: true }
  );

DocumentAnalyticsSummarySchema.index(
  { documentId: 1, date: -1 },
  { unique: true }
);
DocumentAnalyticsSummarySchema.index({ date: -1 });

const DocumentAnalyticsSummary: Model<IDocumentAnalyticsSummary> =
  mongoose.models.DocumentAnalyticsSummary ||
  mongoose.model<IDocumentAnalyticsSummary>(
    "DocumentAnalyticsSummary",
    DocumentAnalyticsSummarySchema
  );

export default DocumentAnalyticsSummary;
