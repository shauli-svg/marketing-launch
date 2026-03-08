import { spawn } from "node:child_process";
import type { RepoMap, VerificationResult } from "@ade/domain";

export type LocalVerifierOptions = {
  repoRoot: string;
  executeCommands: boolean;
};

const ALLOWLIST = [/^npm run /, /^pnpm /, /^yarn /, /^bun /];

export class LocalVerifier {
  constructor(private readonly options: LocalVerifierOptions) {}

  async verify(repo: RepoMap): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];
    results.push(...await this.runStage("lint", repo.lintCommands));
    results.push(...await this.runStage("test", repo.testCommands));
    results.push(...await this.runStage("build", repo.buildCommands));
    results.push(await this.preview(repo));
    return results;
  }

  async preview(repo: RepoMap): Promise<VerificationResult> {
    if (repo.deployTargets.length === 0) {
      return {
        stage: "preview",
        passed: true,
        command: "preview:skipped",
        exitCode: 0,
        evidence: ["No preview provider detected. Preview skipped by policy."]
      };
    }

    return {
      stage: "preview",
      passed: true,
      command: `preview:${repo.deployTargets[0]?.provider ?? "unknown"}`,
      exitCode: 0,
      evidence: [`Preview provider detected: ${repo.deployTargets[0]?.provider ?? "unknown"}. Stub preview passed.`]
    };
  }

  private async runStage(stage: "lint" | "test" | "build", commands: string[]): Promise<VerificationResult[]> {
    if (commands.length === 0) {
      return [{ stage, passed: true, command: `${stage}:skipped`, exitCode: 0, evidence: [`No ${stage} command detected.`] }];
    }

    const command = commands[0];
    if (!this.options.executeCommands) {
      return [{ stage, passed: true, command, exitCode: 0, evidence: [`Dry-run verification for: ${command}`] }];
    }

    if (!ALLOWLIST.some((pattern) => pattern.test(command))) {
      return [{ stage, passed: false, command, exitCode: 126, evidence: ["Command rejected by allowlist."] }];
    }

    const result = await runShellCommand(command, this.options.repoRoot);
    return [{
      stage,
      passed: result.exitCode === 0,
      command,
      exitCode: result.exitCode,
      evidence: result.output.length > 0 ? result.output : ["Command completed with no output."]
    }];
  }
}

async function runShellCommand(command: string, cwd: string): Promise<{ exitCode: number; output: string[] }> {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    const output: string[] = [];

    child.stdout.on("data", (chunk) => output.push(String(chunk).trim()));
    child.stderr.on("data", (chunk) => output.push(String(chunk).trim()));
    child.on("close", (code) => resolve({ exitCode: code ?? 1, output: output.filter(Boolean) }));
  });
}
