import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseTask } from "@ade/domain";
import { HeuristicContextBuilder } from "@ade/context-builder";
import { FilesystemRepoMapper } from "@ade/repo-mapper";

describe("HeuristicContextBuilder", () => {
  it("selects files relevant to the email validation task", async () => {
    const repoRoot = path.resolve("examples/repos/demo-app");
    const task = parseTask({
      id: "task-001",
      title: "Add server-side validation for email update form",
      description: "Ensure invalid email is rejected.",
      acceptanceCriteria: ["Invalid email is rejected."],
      constraints: [],
      repoRoot,
      maxFilesToEdit: 5
    });

    const repo = await new FilesystemRepoMapper().map(repoRoot);
    const workingSet = await new HeuristicContextBuilder().build(task, repo);

    expect(workingSet.some((file) => file.includes("validation"))).toBe(true);
    expect(workingSet.some((file) => file.includes("update-email"))).toBe(true);
  });
});
