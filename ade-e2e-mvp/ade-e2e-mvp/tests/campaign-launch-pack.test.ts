import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseCampaignBrief } from "@ade/domain";
import { FilesystemRepoMapper } from "@ade/repo-mapper";
import { CampaignLaunchPackAgent } from "@ade/campaign-launch-pack";

describe("CampaignLaunchPackAgent", () => {
  it("builds a launch pack with working set, assets, and tracking plan", async () => {
    const brief = parseCampaignBrief({
      id: "campaign-001",
      name: "Launch Sprint",
      product: "ADE Launch Studio",
      audience: "growth teams",
      offer: "a launch pack in one day",
      tone: "expert",
      channels: ["linkedin", "email"],
      primaryCta: "Book a launch review",
      landingPagePath: "src/pages/launch.tsx",
      constraints: ["Single CTA only"]
    });

    const repoRoot = path.resolve("examples/repos/marketing-site");
    const repo = await new FilesystemRepoMapper().map(repoRoot);
    const pack = await new CampaignLaunchPackAgent().build(brief, repo);

    expect(pack.workingSet).toContain("src/pages/launch.tsx");
    expect(pack.assets.find((asset) => asset.id === "landing-copy")?.body).toContain("Book a launch review");
    expect(pack.utmPlan).toHaveLength(2);
    expect(pack.eventMap.some((event) => event.event === "cta_click")).toBe(true);
  });
});
