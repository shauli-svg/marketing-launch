import type { Decision, ExecutionPlan, RepoMap, RunResult, TaskSpec, VerificationResult } from "@ade/domain";
import { evaluatePlanPolicy } from "@ade/policy";

export interface OrchestratorDeps {
  repoMapper: { map(repoRoot: string): Promise<RepoMap> };
  contextBuilder: { build(task: TaskSpec, repo: RepoMap): Promise<string[]> };
  planner: { plan(task: TaskSpec, repo: RepoMap, workingSet: string[]): Promise<ExecutionPlan> };
  executor: { execute(plan: ExecutionPlan): Promise<{ changedFiles: string[]; journalId: string; actions: { type: string; detail: string }[] }> };
  verifier: { verify(repo: RepoMap): Promise<VerificationResult[]> };
  artifactWriter: {
    write(input: {
      task: TaskSpec;
      plan: ExecutionPlan;
      execution: { changedFiles: string[]; journalId: string; actions: { type: string; detail: string }[] };
      verification: VerificationResult[];
      decision: Decision;
    }): Promise<{ prTitle: string; prBody: string; summaryPath?: string }>;
  };
}

export async function runTask(task: TaskSpec, deps: OrchestratorDeps): Promise<RunResult> {
  const repo = await deps.repoMapper.map(task.repoRoot);
  const workingSet = await deps.contextBuilder.build(task, repo);
  const plan = await deps.planner.plan(task, repo, workingSet);
  const policy = evaluatePlanPolicy(task, repo, plan);

  if (!policy.allowed) {
    const decision: Decision = {
      kind: "FAILED_SAFE",
      rationale: "Plan violates execution policy.",
      failurePoint: "policy",
      evidence: policy.reasons
    };
    const execution = { changedFiles: [], journalId: "journal-none", actions: [{ type: "NOOP", detail: "Execution stopped by policy." }] };
    const verification: VerificationResult[] = [];
    const artifacts = await deps.artifactWriter.write({ task, plan, execution, verification, decision });
    return { task, repo, workingSet, plan, execution, verification, decision, artifacts };
  }

  if (policy.requiresHumanApproval) {
    const decision: Decision = {
      kind: "NEEDS_HUMAN_REVIEW",
      rationale: "Plan touches sensitive areas and requires approval before execution.",
      blockers: policy.reasons,
      evidence: policy.reasons
    };
    const execution = { changedFiles: [], journalId: "journal-none", actions: [{ type: "NOOP", detail: "Awaiting human approval." }] };
    const verification: VerificationResult[] = [];
    const artifacts = await deps.artifactWriter.write({ task, plan, execution, verification, decision });
    return { task, repo, workingSet, plan, execution, verification, decision, artifacts };
  }

  const execution = await deps.executor.execute(plan);
  const verification = await deps.verifier.verify(repo);
  const decision = decide(task, execution.changedFiles, verification);
  const artifacts = await deps.artifactWriter.write({ task, plan, execution, verification, decision });

  return { task, repo, workingSet, plan, execution, verification, decision, artifacts };
}

export function decide(task: TaskSpec, changedFiles: string[], verification: VerificationResult[]): Decision {
  const failed = verification.find((entry) => !entry.passed);
  if (failed) {
    return {
      kind: "FAILED_SAFE",
      rationale: `Verification failed at stage ${failed.stage}.`,
      failurePoint: failed.stage,
      evidence: failed.evidence
    };
  }

  if (changedFiles.length > task.maxFilesToEdit) {
    return {
      kind: "NEEDS_HUMAN_REVIEW",
      rationale: "Execution exceeded the file budget.",
      blockers: [`Changed files=${changedFiles.length}, maxFilesToEdit=${task.maxFilesToEdit}`],
      evidence: changedFiles
    };
  }

  return {
    kind: "COMPLETE_WITH_PR",
    rationale: "All verification gates passed within the bounded execution policy.",
    evidence: verification.flatMap((result) => result.evidence)
  };
}
