import type { ExecutionAction, ExecutionOutput, ExecutionPlan } from "@ade/domain";
import { JsonJournal } from "@ade/journal";

export class DryRunExecutor {
  constructor(private readonly journal: JsonJournal) {}

  async execute(plan: ExecutionPlan): Promise<ExecutionOutput> {
    const journalId = `journal-${Date.now()}`;
    const actions: ExecutionAction[] = [{ type: "CREATE_BRANCH", detail: "dry-run/ade-task" }];
    const changedFiles = new Set<string>();

    for (const step of plan.steps) {
      await this.journal.append({
        timestamp: new Date().toISOString(),
        type: "plan.step",
        payload: { stepId: step.id, objective: step.objective, files: step.files }
      });

      if (step.id === "inspect") {
        actions.push({ type: "NOOP", detail: step.objective });
        continue;
      }

      for (const file of step.files) {
        changedFiles.add(file);
        actions.push({ type: "EDIT_FILE", detail: `Would update ${file}` });
      }
    }

    actions.push({ type: "WRITE_ARTIFACT", detail: "Would write PR summary artifact." });

    return { changedFiles: [...changedFiles], journalId, actions };
  }
}
