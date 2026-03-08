export type Decision =
  | { kind: "COMPLETE_WITH_PR"; rationale: string; evidence: string[] }
  | { kind: "NEEDS_HUMAN_REVIEW"; rationale: string; blockers: string[]; evidence: string[] }
  | { kind: "FAILED_SAFE"; rationale: string; failurePoint: string; evidence: string[] };
