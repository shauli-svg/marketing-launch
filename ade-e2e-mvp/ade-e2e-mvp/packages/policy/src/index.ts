import type { ExecutionPlan, RepoMap, TaskSpec } from "@ade/domain";

const SENSITIVE_PATTERNS = [/auth/i, /permission/i, /payment/i, /billing/i, /schema/i, /migration/i, /infra/i, /deploy/i];

export type PolicyCheck = {
  allowed: boolean;
  requiresHumanApproval: boolean;
  reasons: string[];
};

export function evaluatePlanPolicy(task: TaskSpec, repo: RepoMap, plan: ExecutionPlan): PolicyCheck {
  const reasons: string[] = [];
  const touchedFiles = new Set(plan.steps.flatMap((step) => step.files));

  if (touchedFiles.size > task.maxFilesToEdit) {
    reasons.push(`Plan touches ${touchedFiles.size} files, exceeding maxFilesToEdit=${task.maxFilesToEdit}.`);
  }

  for (const file of touchedFiles) {
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(file))) {
      reasons.push(`Sensitive path touched: ${file}.`);
    }
  }

  if (repo.deployTargets.length > 0 && [...touchedFiles].some((file) => /vercel|render|netlify|wrangler|infra|deploy/i.test(file))) {
    reasons.push("Deployment or infrastructure files were touched.");
  }

  const requiresHumanApproval = task.requiresHumanApproval || reasons.some((reason) => reason.startsWith("Sensitive path") || reason.includes("Deployment"));

  return {
    allowed: !reasons.some((reason) => reason.includes("exceeding")),
    requiresHumanApproval,
    reasons
  };
}
