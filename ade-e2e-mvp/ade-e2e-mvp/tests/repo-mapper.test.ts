import path from "node:path";
import { describe, expect, it } from "vitest";
import { FilesystemRepoMapper } from "@ade/repo-mapper";

describe("FilesystemRepoMapper", () => {
  it("detects scripts, deploy targets, and services", async () => {
    const repoRoot = path.resolve("examples/repos/demo-app");
    const mapper = new FilesystemRepoMapper();
    const repo = await mapper.map(repoRoot);

    expect(repo.buildCommands[0]).toBe("echo build-ok");
    expect(repo.testCommands[0]).toBe("echo test-ok");
    expect(repo.deployTargets[0]?.provider).toBe("vercel");
    expect(repo.services.some((service) => service.type === "web")).toBe(true);
  });
});
