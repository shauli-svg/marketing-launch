import { promises as fs } from "node:fs";
import path from "node:path";
import { HeuristicContextBuilder } from "@ade/context-builder";
import { DryRunExecutor } from "@ade/executor";
import { writeRunArtifacts } from "@ade/artifact-writer";
import { JsonJournal } from "@ade/journal";
import { runTask } from "@ade/orchestrator";
import { DeterministicPlanner } from "@ade/planner";
import { FilesystemRepoMapper } from "@ade/repo-mapper";
import { parseTask } from "@ade/domain";
import { LocalVerifier } from "@ade/verifier";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.task || !args.repo) {
    throw new Error("Usage: tsx apps/control-plane/src/cli.ts --task <task.json> --repo <repoRoot> [--journal <file>] [--execute]");
  }

  const rawTask = JSON.parse(await fs.readFile(args.task, "utf8"));
  rawTask.repoRoot = path.resolve(args.repo);
  const task = parseTask(rawTask);
  const journalPath = path.resolve(args.journal ?? ".ade/journal.json");
  const journal = new JsonJournal(journalPath);
  await journal.reset();

  const result = await runTask(task, {
    repoMapper: new FilesystemRepoMapper(),
    contextBuilder: new HeuristicContextBuilder(),
    planner: new DeterministicPlanner(),
    executor: new DryRunExecutor(journal),
    verifier: new LocalVerifier({ repoRoot: task.repoRoot, executeCommands: args.execute }),
    artifactWriter: {
      write: (input) => writeRunArtifacts({ ...input, outputDir: path.resolve(".ade") })
    }
  });

  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(argv: string[]): { task?: string; repo?: string; journal?: string; execute: boolean } {
  const result: { task?: string; repo?: string; journal?: string; execute: boolean } = { execute: false };
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--task") {
      result.task = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === "--repo") {
      result.repo = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === "--journal") {
      result.journal = argv[index + 1];
      index += 1;
      continue;
    }
    if (current === "--execute") {
      result.execute = true;
    }
  }
  return result;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
