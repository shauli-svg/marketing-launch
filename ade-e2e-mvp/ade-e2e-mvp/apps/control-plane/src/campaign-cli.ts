import { promises as fs } from "node:fs";
import path from "node:path";
import { parseCampaignBrief } from "@ade/domain";
import { CampaignLaunchPackAgent, writeCampaignLaunchPack } from "@ade/campaign-launch-pack";
import { FilesystemRepoMapper } from "@ade/repo-mapper";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.brief || !args.repo) {
    throw new Error("Usage: tsx apps/control-plane/src/campaign-cli.ts --brief <campaign-brief.json> --repo <repoRoot> [--output <dir>]");
  }

  const rawBrief = JSON.parse(await fs.readFile(args.brief, "utf8"));
  const brief = parseCampaignBrief(rawBrief);
  const repoRoot = path.resolve(args.repo);
  const outputDir = path.resolve(args.output ?? ".ade/campaign");

  const repo = await new FilesystemRepoMapper().map(repoRoot);
  const agent = new CampaignLaunchPackAgent();
  const pack = await agent.build(brief, repo);
  const writtenFiles = await writeCampaignLaunchPack(outputDir, pack);

  console.log(JSON.stringify({
    repoRoot,
    outputDir,
    summary: pack.summary,
    workingSet: pack.workingSet,
    pagePatchPlan: pack.pagePatchPlan,
    writtenFiles
  }, null, 2));
}

function parseArgs(argv: string[]): { brief?: string; repo?: string; output?: string } {
  const result: { brief?: string; repo?: string; output?: string } = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--brief") {
      result.brief = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === "--repo") {
      result.repo = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === "--output") {
      result.output = argv[index + 1];
      index += 1;
    }
  }
  return result;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
