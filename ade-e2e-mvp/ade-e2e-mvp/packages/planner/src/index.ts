import type { ExecutionPlan, PlanStep, RepoMap, RiskLevel, TaskSpec } from "@ade/domain";
import { evaluatePlanPolicy } from "@ade/policy";

export class DeterministicPlanner {
  async plan(task: TaskSpec, repo: RepoMap, workingSet: string[]): Promise<ExecutionPlan> {
    const featureFiles = workingSet.filter((file) => !/test|spec/i.test(file)).slice(0, 3);
    const testFiles = workingSet.filter((file) => /test|spec/i.test(file)).slice(0, 2);
    const touched = [...new Set([...featureFiles, ...testFiles])];

    const steps: PlanStep[] = [
      buildStep("inspect", "Inspect existing implementation boundaries and constraints.", workingSet.slice(0, 4), "Existing validation and route boundaries must be located."),
      buildStep("patch-feature", `Patch the target implementation for task: ${task.title}`, featureFiles, "If feature behavior becomes ambiguous or expands beyond acceptance criteria."),
      buildStep("add-tests", "Add or adjust tests that prove acceptance criteria.", testFiles.length > 0 ? testFiles : workingSet.slice(0, 1), "If tests cannot be updated without broad fixture changes."),
      buildStep("verify", "Run lint, targeted tests, build, and preview checks.", touched, "If verification fails without a clear corrective action.")
    ];

    const plan: ExecutionPlan = {
      summary: `Bounded plan for "${task.title}" touching up to ${touched.length} files.`,
      assumptions: [
        "Repo scripts reflect the intended verification gates.",
        "Relevant files are present in the working set."
      ],
      unknowns: repo.deployTargets.length === 0 ? ["No preview deploy target detected. Preview step may be skipped."] : [],
      steps,
      stopConditions: [
        "Task is underspecified.",
        "Touched files exceed budget.",
        "Verification fails outside the target area.",
        "Sensitive paths require approval."
      ]
    };

    const policy = evaluatePlanPolicy(task, repo, plan);
    if (policy.requiresHumanApproval) plan.unknowns.push(...policy.reasons);

    return plan;
  }
}

function buildStep(id: string, objective: string, files: string[], rollbackCondition: string): PlanStep {
  return {
    id,
    objective,
    files,
    evidenceRequired: ["Changed files list", "Verification logs", "Acceptance criteria trace"],
    rollbackCondition,
    risk: calculateRisk(files)
  };
}

function calculateRisk(files: string[]): RiskLevel {
  if (files.some((file) => /auth|payment|billing|schema|migration|infra|deploy/i.test(file))) return "high";
  if (files.length >= 4 || files.some((file) => /api|route|server/i.test(file))) return "medium";
  return "low";
}
