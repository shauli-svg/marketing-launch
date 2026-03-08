import { describe, expect, it } from "vitest";
import type { ExecutionPlan, RepoMap, TaskSpec, VerificationResult } from "@ade/domain";
import { evaluatePlanPolicy } from "@ade/policy";
import { decide } from "@ade/orchestrator";

const task: TaskSpec = {
  id: "task-001",
  title: "Patch payment flow",
  description: "Example",
  acceptanceCriteria: ["Works"],
  constraints: [],
  repoRoot: ".",
  maxFilesToEdit: 2,
  requiresHumanApproval: false
};

const repo: RepoMap = {
  packageManager: "npm",
  services: [],
  testCommands: [],
  buildCommands: [],
  lintCommands: [],
  deployTargets: [{ provider: "vercel" }],
  criticalPaths: ["src/payments/checkout.ts"],
  files: ["src/payments/checkout.ts"],
  repoRoot: "."
};

describe("policy and decision", () => {
  it("requires approval for sensitive paths", () => {
    const plan: ExecutionPlan = {
      summary: "Sensitive change",
      assumptions: [],
      unknowns: [],
      stopConditions: [],
      steps: [
        {
          id: "patch",
          objective: "Patch payments",
          files: ["src/payments/checkout.ts"],
          evidenceRequired: [],
          rollbackCondition: "revert",
          risk: "high"
        }
      ]
    };

    const policy = evaluatePlanPolicy(task, repo, plan);
    expect(policy.requiresHumanApproval).toBe(true);
  });

  it("fails safe on failed verification", () => {
    const verification: VerificationResult[] = [{
      stage: "test",
      passed: false,
      command: "npm run test",
      exitCode: 1,
      evidence: ["test failed"]
    }];

    const decision = decide(task, ["src/x.ts"], verification);
    expect(decision.kind).toBe("FAILED_SAFE");
  });

  it("completes when all gates pass", () => {
    const verification: VerificationResult[] = [{
      stage: "test",
      passed: true,
      command: "npm run test",
      exitCode: 0,
      evidence: ["all good"]
    }];

    const decision = decide({ ...task, maxFilesToEdit: 5 }, ["src/x.ts"], verification);
    expect(decision.kind).toBe("COMPLETE_WITH_PR");
  });
});
