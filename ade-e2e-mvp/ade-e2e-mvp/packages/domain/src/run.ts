import type { Decision } from "./decision.js";
import type { ExecutionPlan } from "./plan.js";
import type { RepoMap } from "./repo.js";
import type { TaskSpec } from "./task.js";
import type { VerificationResult } from "./verification.js";

export type ExecutionAction =
  | { type: "CREATE_BRANCH"; detail: string }
  | { type: "EDIT_FILE"; detail: string }
  | { type: "WRITE_ARTIFACT"; detail: string }
  | { type: "NOOP"; detail: string };

export type ExecutionOutput = {
  changedFiles: string[];
  journalId: string;
  actions: ExecutionAction[];
};

export type RunResult = {
  task: TaskSpec;
  repo: RepoMap;
  workingSet: string[];
  plan: ExecutionPlan;
  execution: ExecutionOutput;
  verification: VerificationResult[];
  decision: Decision;
  artifacts: {
    prTitle: string;
    prBody: string;
    summaryPath?: string;
  };
};
