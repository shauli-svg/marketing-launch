import path from "node:path";
import type { RepoMap, TaskSpec } from "@ade/domain";

const ALWAYS_INCLUDE = [/package\.json$/, /tsconfig/i, /vitest/i, /jest/i];

export class HeuristicContextBuilder {
  constructor(private readonly maxFiles = 12) {}

  async build(task: TaskSpec, repo: RepoMap): Promise<string[]> {
    const tokens = tokenize(`${task.title} ${task.description} ${task.acceptanceCriteria.join(" ")}`);
    const scored = repo.files
      .map((file) => ({ file, score: scoreFile(file, tokens) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

    const selected = new Set<string>();

    for (const file of repo.files) {
      if (ALWAYS_INCLUDE.some((pattern) => pattern.test(file))) selected.add(file);
    }

    for (const entry of scored.slice(0, this.maxFiles)) {
      selected.add(entry.file);
    }

    for (const file of repo.criticalPaths.slice(0, 2)) {
      if (selected.size >= this.maxFiles) break;
      selected.add(file);
    }

    return [...selected].sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
  }
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function scoreFile(file: string, tokens: string[]): number {
  const lower = file.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (lower.includes(token)) score += 4;
  }

  if (/test|spec/.test(lower)) score += 2;
  if (/validation|validator|schema|form|route|api/.test(lower)) score += 3;
  if (/readme|package\.json|tsconfig/.test(lower)) score += 1;

  return score;
}
