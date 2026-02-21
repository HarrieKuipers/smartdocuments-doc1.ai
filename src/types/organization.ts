export interface IBrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface IMember {
  userId: string;
  role: string;
  addedAt: Date;
}

export type UserRole = "owner" | "admin" | "editor" | "viewer";
export type PlanType = "free" | "pro" | "enterprise";
