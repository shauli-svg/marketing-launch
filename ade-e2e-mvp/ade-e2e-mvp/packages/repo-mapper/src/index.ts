import { promises as fs } from "node:fs";
import path from "node:path";
import type { RepoMap, RepoService, ServiceType } from "@ade/domain";

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", ".next", ".turbo", "coverage"]);

export class FilesystemRepoMapper {
  async map(repoRoot: string): Promise<RepoMap> {
    const files = await listFiles(repoRoot);
    const rootPackageJson = await safeReadJson<Record<string, unknown>>(path.join(repoRoot, "package.json"));
    const packageManager = detectPackageManager(files);
    const services = await detectServices(repoRoot, files);
    const scripts = readScripts(rootPackageJson);
    const deployTargets = detectDeployTargets(files);
    const criticalPaths = files.filter((file) => /auth|permission|billing|payment|schema|migration|infra|deploy/i.test(file));

    return {
      packageManager,
      services,
      testCommands: scripts.test,
      buildCommands: scripts.build,
      lintCommands: scripts.lint,
      deployTargets,
      criticalPaths,
      files,
      repoRoot
    };
  }
}

async function listFiles(repoRoot: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".github") continue;

      const absolute = path.join(current, entry.name);
      const relative = path.relative(repoRoot, absolute).split(path.sep).join("/");

      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(absolute);
      } else {
        results.push(relative);
      }
    }
  }

  await walk(repoRoot);
  return results.sort();
}

function detectPackageManager(files: string[]): RepoMap["packageManager"] {
  if (files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes("yarn.lock")) return "yarn";
  if (files.includes("bun.lockb") || files.includes("bun.lock")) return "bun";
  if (files.includes("package-lock.json")) return "npm";
  return undefined;
}

async function detectServices(repoRoot: string, files: string[]): Promise<RepoService[]> {
  const packageJsonPaths = files.filter((file) => file.endsWith("package.json"));
  const services: RepoService[] = [];

  for (const packageJsonPath of packageJsonPaths) {
    const packageJson = await safeReadJson<Record<string, unknown>>(path.join(repoRoot, packageJsonPath));
    const name = typeof packageJson?.name === "string" ? packageJson.name : packageJsonPath.replace("/package.json", "");
    const dir = packageJsonPath === "package.json" ? "." : path.posix.dirname(packageJsonPath);
    const type = classifyService(dir, packageJson);
    services.push({ name, path: dir, type });
  }

  return services;
}

function classifyService(dir: string, pkg: Record<string, unknown> | null): ServiceType {
  const scripts = readScripts(pkg);
  const deps = new Set([
    ...Object.keys((pkg?.dependencies as Record<string, string> | undefined) ?? {}),
    ...Object.keys((pkg?.devDependencies as Record<string, string> | undefined) ?? {})
  ]);

  if (dir.includes("worker") || scripts.build.some((script) => script.includes("worker"))) return "worker";
  if (deps.has("next") || deps.has("react") || dir.includes("web") || scripts.build.some((script) => script.includes("next build") || script.includes("vite build"))) return "web";
  if (deps.has("express") || deps.has("fastify") || dir.includes("api") || scripts.build.some((script) => script.includes("tsc"))) return "api";
  return "lib";
}

function readScripts(pkg: Record<string, unknown> | null): { test: string[]; build: string[]; lint: string[] } {
  const scriptsRecord = (pkg?.scripts as Record<string, string> | undefined) ?? {};
  const test = Object.entries(scriptsRecord).filter(([name]) => name.startsWith("test")).map(([, cmd]) => cmd);
  const build = Object.entries(scriptsRecord).filter(([name]) => name.startsWith("build")).map(([, cmd]) => cmd);
  const lint = Object.entries(scriptsRecord).filter(([name]) => name.startsWith("lint")).map(([, cmd]) => cmd);
  return { test: dedupe(test), build: dedupe(build), lint: dedupe(lint) };
}

function detectDeployTargets(files: string[]): Array<{ provider: string; project?: string }> {
  const targets: Array<{ provider: string; project?: string }> = [];
  if (files.includes("vercel.json")) targets.push({ provider: "vercel" });
  if (files.includes("render.yaml")) targets.push({ provider: "render" });
  if (files.includes("wrangler.toml")) targets.push({ provider: "cloudflare-pages" });
  if (files.includes("netlify.toml")) targets.push({ provider: "netlify" });
  return targets;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

async function safeReadJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
