import { promises as fs } from "node:fs";
import path from "node:path";
import type { CampaignBrief, CampaignLaunchPack, EventSpec, LaunchAsset, PagePatchPlan, RepoMap, UtmRow } from "@ade/domain";

export class CampaignLaunchPackAgent {
  async build(brief: CampaignBrief, repo: RepoMap): Promise<CampaignLaunchPack> {
    const workingSet = selectMarketingWorkingSet(brief, repo);
    const pagePatchPlan = buildPagePatchPlan(brief, workingSet);
    const utmPlan = buildUtmPlan(brief);
    const eventMap = buildEventMap(brief);
    const assets = buildAssets(brief, pagePatchPlan, utmPlan, eventMap);

    return {
      brief,
      workingSet,
      pagePatchPlan,
      assets,
      utmPlan,
      eventMap,
      summary: `Launch pack for ${brief.name} with ${assets.length} assets across ${brief.channels.length} channels.`
    };
  }
}

export async function writeCampaignLaunchPack(outputDir: string, pack: CampaignLaunchPack): Promise<string[]> {
  await fs.mkdir(outputDir, { recursive: true });
  const written: string[] = [];

  for (const asset of pack.assets) {
    const fileName = asset.id.replace(/[^a-z0-9-]/gi, "_").toLowerCase() + fileExtension(asset.type);
    const absolute = path.join(outputDir, fileName);
    await fs.writeFile(absolute, asset.body, "utf8");
    written.push(absolute);
  }

  const summaryPath = path.join(outputDir, "launch-pack.summary.json");
  await fs.writeFile(summaryPath, JSON.stringify({
    brief: pack.brief,
    workingSet: pack.workingSet,
    pagePatchPlan: pack.pagePatchPlan,
    utmPlan: pack.utmPlan,
    eventMap: pack.eventMap,
    summary: pack.summary
  }, null, 2), "utf8");
  written.push(summaryPath);

  return written;
}

function fileExtension(type: LaunchAsset["type"]): string {
  return type === "utm-plan" || type === "event-map" ? ".json" : ".md";
}

export function selectMarketingWorkingSet(brief: CampaignBrief, repo: RepoMap): string[] {
  const tokens = tokenize([brief.name, brief.product, brief.audience, brief.offer, brief.primaryCta, ...brief.constraints].join(" "));
  const target = brief.landingPagePath?.toLowerCase();
  const scored = repo.files.map((file) => ({ file, score: scoreFile(file, tokens, target) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
    .slice(0, 10)
    .map((entry) => entry.file);

  const selected = new Set<string>(scored);
  for (const file of repo.files) {
    if (/analytics|tracking|utm|hero|landing|page|form|cta/i.test(file) && selected.size < 12) {
      selected.add(file);
    }
  }

  return [...selected].sort();
}

export function buildPagePatchPlan(brief: CampaignBrief, workingSet: string[]): PagePatchPlan {
  const prioritized = workingSet.filter((file) => /page|landing|hero|form|cta/i.test(file)).slice(0, 5);

  return {
    targetFiles: prioritized.length > 0 ? prioritized : workingSet.slice(0, 3),
    rationale: `Prioritize landing surface, CTA, and tracking for ${brief.audience} with offer "${brief.offer}".`,
    ctaSelectorHint: '[data-cta="primary"], button[type="submit"], a[href*="demo"]',
    formSelectorHint: workingSet.some((file) => /form/i.test(file)) ? '[data-form], form' : undefined
  };
}

export function buildUtmPlan(brief: CampaignBrief): UtmRow[] {
  const campaignSlug = slugify(brief.name);
  return brief.channels.map((channel, index) => ({
    channel,
    source: channel === "google-search" ? "google" : channel === "meta" ? "facebook" : channel,
    medium: channel === "email" ? "email" : channel === "organic" ? "seo" : "cpc",
    campaign: campaignSlug,
    content: `${campaignSlug}-${index + 1}`
  }));
}

export function buildEventMap(brief: CampaignBrief): EventSpec[] {
  return [
    {
      event: "lp_view",
      trigger: "page load",
      payload: ["campaign_id", "page_variant", "audience"]
    },
    {
      event: "cta_click",
      trigger: `click on primary CTA: ${brief.primaryCta}`,
      payload: ["campaign_id", "cta_text", "page_variant"]
    },
    {
      event: "form_submit",
      trigger: "submit lead form",
      payload: ["campaign_id", "offer", "channel", "form_id"]
    }
  ];
}

export function buildAssets(brief: CampaignBrief, pagePatchPlan: PagePatchPlan, utmPlan: UtmRow[], eventMap: EventSpec[]): LaunchAsset[] {
  const headlines = buildHeadlineVariants(brief);
  const valueBullets = buildValueBullets(brief);
  const adBlocks = buildAdBlocks(brief, headlines);
  const emails = buildEmails(brief, headlines);

  return [
    {
      id: "landing-copy",
      type: "landing-copy",
      title: "Landing page copy",
      body: [
        `# ${brief.name} — Landing Page Copy`,
        "",
        "## Primary headline",
        headlines[0]!,
        "",
        "## Alternate headlines",
        ...headlines.slice(1).map((item) => `- ${item}`),
        "",
        "## Subheadline",
        buildSubheadline(brief),
        "",
        "## CTA",
        `- Primary CTA: ${brief.primaryCta}`,
        "",
        "## Proof / value bullets",
        ...valueBullets.map((item) => `- ${item}`),
        "",
        "## Patch plan",
        `- Target files: ${pagePatchPlan.targetFiles.join(", ") || "none detected"}`,
        `- Rationale: ${pagePatchPlan.rationale}`,
        `- CTA selector hint: ${pagePatchPlan.ctaSelectorHint}`,
        pagePatchPlan.formSelectorHint ? `- Form selector hint: ${pagePatchPlan.formSelectorHint}` : undefined
      ].filter(Boolean).join("\n")
    },
    {
      id: "ad-copy",
      type: "ad-copy",
      title: "Ad copy variants",
      body: [
        `# ${brief.name} — Ad Variants`,
        "",
        ...adBlocks
      ].join("\n")
    },
    {
      id: "email-sequence",
      type: "email",
      title: "Email sequence",
      body: [
        `# ${brief.name} — Email Follow-up`,
        "",
        ...emails
      ].join("\n")
    },
    {
      id: "utm-plan",
      type: "utm-plan",
      title: "UTM plan",
      body: JSON.stringify(utmPlan, null, 2)
    },
    {
      id: "event-map",
      type: "event-map",
      title: "Event map",
      body: JSON.stringify(eventMap, null, 2)
    },
    {
      id: "launch-checklist",
      type: "checklist",
      title: "Launch checklist",
      body: [
        `# ${brief.name} — Launch Checklist`,
        "",
        "- Confirm landing page copy is patched into target files.",
        "- Confirm primary CTA routes to the intended conversion path.",
        "- Confirm UTM parameters are applied to every paid and email link.",
        "- Confirm lp_view, cta_click, and form_submit fire in preview.",
        "- Confirm thank-you state or confirmation email exists.",
        brief.successMetric ? `- Track primary success metric: ${brief.successMetric}.` : "- Define a primary success metric before launch.",
        ...brief.constraints.map((item) => `- Constraint: ${item}`)
      ].join("\n")
    }
  ];
}

function buildHeadlineVariants(brief: CampaignBrief): string[] {
  const tonePrefix = brief.tone === "urgent"
    ? "Launch faster with"
    : brief.tone === "expert"
      ? "A precise way to improve"
      : brief.tone === "friendly"
        ? "A simpler way to get"
        : "Get";
  return [
    `${tonePrefix} ${brief.offer} for ${brief.audience}`,
    `${brief.product}: ${brief.offer} without extra friction`,
    `${brief.audience} can move from interest to ${brief.primaryCta.toLowerCase()} faster`
  ];
}

function buildSubheadline(brief: CampaignBrief): string {
  return `${brief.product} helps ${brief.audience} act on ${brief.offer}. Use this campaign to move visitors toward "${brief.primaryCta}" with a single clear conversion path.`;
}

function buildValueBullets(brief: CampaignBrief): string[] {
  return [
    `Position ${brief.product} around the specific offer: ${brief.offer}.`,
    `Reduce decision friction for ${brief.audience} with one clear CTA.`,
    "Connect every channel to a consistent landing page and tracking plan."
  ];
}

function buildAdBlocks(brief: CampaignBrief, headlines: string[]): string[] {
  const description = `Offer: ${brief.offer}. CTA: ${brief.primaryCta}. Audience: ${brief.audience}.`;
  return brief.channels.map((channel, index) => [
    `## ${channel}`,
    `### Variant ${index + 1}`,
    `Headline: ${headlines[index % headlines.length]}`,
    `Body: ${description}`,
    ""
  ].join("\n"));
}

function buildEmails(brief: CampaignBrief, headlines: string[]): string[] {
  return [
    "## Email 1",
    `Subject: ${headlines[0]}`,
    "",
    `Hi,`,
    "",
    `${brief.product} is running a focused campaign around ${brief.offer}.`,
    `The goal is simple: help ${brief.audience} move toward ${brief.primaryCta.toLowerCase()} without extra steps.`,
    `CTA: ${brief.primaryCta}`,
    "",
    "## Email 2",
    `Subject: Still interested in ${brief.offer}?`,
    "",
    `We built a dedicated landing experience so ${brief.audience} can evaluate the offer quickly and take the next step.`,
    `CTA: ${brief.primaryCta}`
  ];
}

function scoreFile(file: string, tokens: string[], target?: string): number {
  const lower = file.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (lower.includes(token)) score += 3;
  }
  if (target && lower.includes(target)) score += 12;
  if (/landing|page|hero|form|cta|analytics|tracking|utm|head/i.test(lower)) score += 5;
  if (/test|spec/.test(lower)) score += 1;
  return score;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
