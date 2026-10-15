import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value), { mode: 0o600 });
  await fs.rename(temp, file);
}
export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, "utf8")) as T; }
  catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return fallback; throw e; }
}
