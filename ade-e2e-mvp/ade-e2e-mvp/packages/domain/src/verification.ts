export type VerificationStage = "lint" | "test" | "build" | "preview";

export type VerificationResult = {
  stage: VerificationStage;
  passed: boolean;
  command: string;
  exitCode: number;
  evidence: string[];
};
