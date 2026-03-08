import { describe, expect, it } from "vitest";
import type { ExecutionPlan, RepoMap, TaskSpec, VerificationResult } from "@ade/domain";
import { runTask } from "@ade/orchestrator";

describe("runTask", () => {
  it("returns a PR-complete decision on happy path", async () => {
    const task: TaskSpec = {
      id: "task-001",
      title: "Fix validation",
      description: "Example",
      acceptanceCriteria: ["Works"],
      constraints: [],
      repoRoot: ".",
      maxFilesToEdit: 5,
      requiresHumanApproval: false
    };

    const repo: RepoMap = {
      packageManager: "npm",
      services: [],
      testCommands: ["npm run test"],
      buildCommands: ["npm run build"],
      lintCommands: ["npm run lint"],
      deployTargets: [],
      criticalPaths: [],
      files: ["src/validation.ts", "tests/validation.test.ts"],
      repoRoot: "."
    };

    const plan: ExecutionPlan = {
      summary: "Example",
      assumptions: [],
      unknowns: [],
      stopConditions: [],
      steps: [
        {
          id: "patch",
          objective: "Patch",
          files: ["src/validation.ts", "tests/validation.test.ts"],
          evidenceRequired: [],
          rollbackCondition: "revert",
          risk: "low"
        }
      ]
    };

    const verification: VerificationResult[] = [
      { stage: "lint", passed: true, command: "npm run lint", exitCode: 0, evidence: ["lint"] },
      { stage: "test", passed: true, command: "npm run test", exitCode: 0, evidence: ["test"] },
      { stage: "build", passed: true, command: "npm run build", exitCode: 0, evidence: ["build"] },
      { stage: "preview", passed: true, command: "preview:skipped", exitCode: 0, evidence: ["preview"] }
    ];

    const result = await runTask(task, {
      repoMapper: { map: async () => repo },
      contextBuilder: { build: async () => repo.files },
      planner: { plan: async () => plan },
      executor: { execute: async () => ({ changedFiles: plan.steps[0]!.files, journalId: "j1", actions: [] }) },
      verifier: { verify: async () => verification },
      artifactWriter: { write: async () => ({ prTitle: "x", prBody: "y", summaryPath: "z" }) }
    });

    expect(result.decision.kind).toBe("COMPLETE_WITH_PR");
    expect(result.execution.changedFiles.length).toBe(2);
  });
});
