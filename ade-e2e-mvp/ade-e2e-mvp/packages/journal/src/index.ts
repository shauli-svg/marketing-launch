import { promises as fs } from "node:fs";
import path from "node:path";

export type JournalEvent = {
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
};

export class JsonJournal {
  constructor(private readonly filePath: string) {}

  async append(event: JournalEvent): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const line = JSON.stringify(event);
    await fs.appendFile(this.filePath, `${line}\n`, "utf8");
  }

  async reset(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, "", "utf8");
  }
}
