import { PLANS, type PlanType } from "./stripe";

export function canCreateDocument(plan: PlanType, currentCount: number): boolean {
  return currentCount < PLANS[plan].maxDocuments;
}

export function canUseLanguageLevel(plan: PlanType, level: string): boolean {
  if (plan === "free") return level === "B1";
  return true;
}

export function canCreateCollection(plan: PlanType): boolean {
  return plan !== "free";
}

export function canUsePasswordProtection(plan: PlanType): boolean {
  return plan !== "free";
}

export function canUseCustomBrand(plan: PlanType): boolean {
  return plan !== "free";
}

export function canUseTemplate(plan: PlanType, templateId: string): boolean {
  if (templateId === "doc1") return true;
  return plan !== "free";
}

export function canEditContent(plan: PlanType): boolean {
  return plan !== "free";
}

export function getMaxTeamMembers(plan: PlanType): number {
  return PLANS[plan].maxTeamMembers;
}

export function canUseVersioning(plan: PlanType): boolean {
  return plan !== "free";
}

export function canUseTeamAnnotations(plan: PlanType): boolean {
  return plan !== "free";
}

export function getMaxPublicAnnotations(plan: PlanType): number {
  if (plan === "free") return 10;
  return Infinity;
}

export function canUseCollectionChat(plan: PlanType): boolean {
  return plan !== "free";
}
