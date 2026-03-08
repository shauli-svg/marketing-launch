export type CampaignChannel = "google-search" | "linkedin" | "meta" | "email" | "organic";

export type CampaignBrief = {
  id: string;
  name: string;
  product: string;
  audience: string;
  offer: string;
  tone: "direct" | "expert" | "friendly" | "urgent";
  channels: CampaignChannel[];
  primaryCta: string;
  landingPagePath?: string;
  successMetric?: string;
  constraints: string[];
};

export type LaunchAsset = {
  id: string;
  type: "landing-copy" | "ad-copy" | "email" | "utm-plan" | "event-map" | "checklist";
  title: string;
  body: string;
};

export type EventSpec = {
  event: string;
  trigger: string;
  payload: string[];
};

export type UtmRow = {
  channel: CampaignChannel;
  source: string;
  medium: string;
  campaign: string;
  content: string;
};

export type PagePatchPlan = {
  targetFiles: string[];
  rationale: string;
  ctaSelectorHint: string;
  formSelectorHint?: string;
};

export type CampaignLaunchPack = {
  brief: CampaignBrief;
  workingSet: string[];
  pagePatchPlan: PagePatchPlan;
  assets: LaunchAsset[];
  utmPlan: UtmRow[];
  eventMap: EventSpec[];
  summary: string;
};

export function parseCampaignBrief(input: unknown): CampaignBrief {
  if (!input || typeof input !== "object") {
    throw new Error("Campaign brief must be an object.");
  }

  const value = input as Record<string, unknown>;
  const channels = parseChannels(value.channels);
  if (channels.length === 0) {
    throw new Error("Campaign brief must include at least one channel.");
  }

  return {
    id: asString(value.id, "campaign-001"),
    name: requiredString(value.name, "Campaign name is required."),
    product: requiredString(value.product, "Product is required."),
    audience: requiredString(value.audience, "Audience is required."),
    offer: requiredString(value.offer, "Offer is required."),
    tone: parseTone(value.tone),
    channels,
    primaryCta: requiredString(value.primaryCta, "Primary CTA is required."),
    landingPagePath: optionalString(value.landingPagePath),
    successMetric: optionalString(value.successMetric),
    constraints: toStringArray(value.constraints)
  };
}

function parseChannels(value: unknown): CampaignChannel[] {
  const allowed: CampaignChannel[] = ["google-search", "linkedin", "meta", "email", "organic"];
  const items = toStringArray(value);
  return items.filter((item): item is CampaignChannel => allowed.includes(item as CampaignChannel));
}

function parseTone(value: unknown): CampaignBrief["tone"] {
  if (value === "direct" || value === "expert" || value === "friendly" || value === "urgent") {
    return value;
  }
  return "direct";
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
  return value.trim();
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "").map((entry) => entry.trim());
}
