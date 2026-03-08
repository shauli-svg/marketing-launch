import { isValidEmail } from "../lib/validation.js";

export async function updateEmail(email: string) {
  if (!isValidEmail(email)) {
    throw new Error("Invalid email.");
  }

  return { ok: true, email };
}
