export type ServiceType = "web" | "api" | "worker" | "lib";

export type RepoService = {
  name: string;
  path: string;
  type: ServiceType;
};

export type RepoMap = {
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
  services: RepoService[];
  testCommands: string[];
  buildCommands: string[];
  lintCommands: string[];
  deployTargets: Array<{ provider: string; project?: string }>;
  criticalPaths: string[];
  files: string[];
  repoRoot: string;
};
