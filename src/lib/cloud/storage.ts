import fs from "node:fs/promises";
import path from "node:path";
import { dataDir } from "../file-utils";
export async function directoryBytes(directory: string): Promise<number> {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((e: NodeJS.ErrnoException) => { if (e.code === "ENOENT") return []; throw e; });
  let sum = 0;
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) sum += await directoryBytes(file);
    else if (entry.isFile() && !entry.name.endsWith(".tmp")) {
      try { sum += (await fs.stat(file)).size; } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
    }
    // Never follow symlinks outside managed storage.
  }
  return sum;
}
export async function storageUsage() {
  await fs.mkdir(dataDir, { recursive: true });
  const stat = await fs.statfs(dataDir);
  const usedBytes = await directoryBytes(dataDir);
  const freeBytes = stat.bavail * stat.bsize;
  const quotaBytes = Number(process.env.DATA_QUOTA_GB || 20) * 1024 ** 3;
  return { usedBytes, freeBytes, quotaBytes, percent: usedBytes / quotaBytes * 100, cleanup: "Review History and Voices; delete only selected items after confirmation. No automatic user-data cleanup." };
}
export async function assertStorageAvailable(additionalBytes = 20 * 1024 ** 2) {
  const usage = await storageUsage();
  if (usage.usedBytes + additionalBytes > usage.quotaBytes || usage.freeBytes < additionalBytes + 512 * 1024 ** 2) throw new Error("Storage quota or free-space reserve reached. Back up and remove selected items in History/Voices, or increase storage.");
}
