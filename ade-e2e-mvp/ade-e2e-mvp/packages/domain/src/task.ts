export type TaskSpec = {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  constraints: string[];
  repoRoot: string;
  maxFilesToEdit: number;
  requiresHumanApproval: boolean;
};

export function parseTask(input: unknown): TaskSpec {
  if (!input || typeof input !== "object") {
    throw new Error("Task must be an object.");
  }

  const value = input as Record<string, unknown>;
  const acceptanceCriteria = toStringArray(value.acceptanceCriteria);
  if (acceptanceCriteria.length === 0) {
    throw new Error("Task must include at least one acceptance criterion.");
  }

  return {
    id: asString(value.id, "task-001"),
    title: requiredString(value.title, "Task title is required."),
    description: asString(value.description, ""),
    acceptanceCriteria,
    constraints: toStringArray(value.constraints),
    repoRoot: asString(value.repoRoot, "."),
    maxFilesToEdit: asPositiveNumber(value.maxFilesToEdit, 5),
    requiresHumanApproval: asBoolean(value.requiresHumanApproval, false)
  };
}

function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
  return value.trim();
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}
