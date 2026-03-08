export type RiskLevel = "low" | "medium" | "high";

export type PlanStep = {
  id: string;
  objective: string;
  files: string[];
  evidenceRequired: string[];
  rollbackCondition: string;
  risk: RiskLevel;
};

export type ExecutionPlan = {
  summary: string;
  assumptions: string[];
  unknowns: string[];
  steps: PlanStep[];
  stopConditions: string[];
};
