import { promises as fs } from "node:fs";
import path from "node:path";
import type { Decision, ExecutionPlan, ExecutionOutput, TaskSpec, VerificationResult } from "@ade/domain";

export async function writeRunArtifacts(input: {
  outputDir: string;
  task: TaskSpec;
  plan: ExecutionPlan;
  execution: ExecutionOutput;
  verification: VerificationResult[];
  decision: Decision;
}): Promise<{ prTitle: string; prBody: string; summaryPath: string }> {
  const prTitle = `[ADE] ${input.task.title}`;
  const prBody = buildPrBody(input);
  const summaryPath = path.join(input.outputDir, "run-summary.md");

  await fs.mkdir(input.outputDir, { recursive: true });
  await fs.writeFile(summaryPath, prBody, "utf8");

  return { prTitle, prBody, summaryPath };
}

function buildPrBody(input: {
  task: TaskSpec;
  plan: ExecutionPlan;
  execution: ExecutionOutput;
  verification: VerificationResult[];
  decision: Decision;
}): string {
  const criteria = input.task.acceptanceCriteria.map((item) => `- [ ] ${item}`).join("\n");
  const changedFiles = input.execution.changedFiles.map((file) => `- ${file}`).join("\n") || "- none";
  const verification = input.verification.map((result) => `- ${result.stage}: ${result.passed ? "pass" : "fail"} (${result.command})`).join("\n");

  return [
    `# ${input.task.title}`,
    "",
    "## Task",
    input.task.description || "_No description provided._",
    "",
    "## Acceptance criteria",
    criteria,
    "",
    "## Plan summary",
    input.plan.summary,
    "",
    "## Changed files",
    changedFiles,
    "",
    "## Verification",
    verification,
    "",
    "## Decision",
    `- kind: ${input.decision.kind}`,
    `- rationale: ${input.decision.rationale}`,
    ""
  ].join("\n");
}
