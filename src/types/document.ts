export interface ISourceFile {
  url: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export interface ISummary {
  original: string;
  B1: string;
  B2: string;
  C1: string;
}

export interface IKeyPoint {
  text: string;
  linkedTerms: string[];
}

export interface IFinding {
  category: string;
  title: string;
  content: string;
}

export interface ITerm {
  term: string;
  definition: string;
  occurrences: number;
}

export interface IDocumentContent {
  originalText: string;
  summary: ISummary;
  keyPoints: IKeyPoint[];
  findings: IFinding[];
  terms: ITerm[];
}

export interface IDocumentAccess {
  type: "public" | "link-only" | "password";
  password?: string;
}

export interface IBrandOverride {
  primary?: string;
  logo?: string;
}

export interface IProcessingProgress {
  step:
    | "text-extraction"
    | "content-analysis"
    | "summary-generation"
    | "language-levels"
    | "term-extraction"
    | "finalizing";
  percentage: number;
}

export interface IDocumentAnalytics {
  totalViews: number;
  uniqueViews: number;
  totalDownloads: number;
  averageReadTime: number;
  chatInteractions: number;
}

export type DocumentStatus = "uploading" | "processing" | "ready" | "error";
export type LanguageLevel = "B1" | "B2" | "C1";
export type AccessType = "public" | "link-only" | "password";
