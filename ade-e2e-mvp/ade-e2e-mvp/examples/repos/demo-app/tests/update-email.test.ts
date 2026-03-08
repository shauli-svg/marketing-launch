import { describe, expect, it } from "vitest";
import { updateEmail } from "../src/api/update-email.js";

describe("updateEmail", () => {
  it("rejects invalid email", async () => {
    await expect(() => updateEmail("bad-email")).rejects.toThrowError("Invalid email.");
  });
});
