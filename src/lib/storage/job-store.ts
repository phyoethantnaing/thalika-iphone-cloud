import { writeJson } from "../cloud/files";
import path from "node:path";
import fs from "node:fs/promises";
import { ensureDataDirs, idStamp, localIsoString, readMarkdownFiles, safeJoin, jobsDir, outputsDir, dataDir } from "../file-utils";
import { parseMarkdown, serializeMarkdown, toNumber } from "../markdown-utils";
import type { JobRecord, OutputFormat, VoiceEmotion } from "../types";
import { deleteListeningReview, readListeningReview } from "./listening-review-store";

export function createJobId() {
  return `job_${idStamp()}`;
}

export async function saveJob(record: Omit<JobRecord, "createdAt"> & { createdAt?: string }) {
  await ensureDataDirs();
  const job: JobRecord = {
    ...record,
    createdAt: record.createdAt || localIsoString()
  };
  const markdown = serializeMarkdown(
    {
      id: job.id,
      scriptId: job.scriptId,
      title: job.title,
      provider: job.provider,
      format: job.format,
      speed: job.speed,
      emotion: job.emotion,
      status: job.status,
      audioFile: job.audioFile,
      rawAudioFile: job.rawAudioFile,
      error: job.error,
      completedChunks: job.completedChunks,
      totalChunks: job.totalChunks,
      progressMessage: job.progressMessage,
      voiceProfileId: job.voiceProfileId,
      lexiconRevision: job.lexiconRevision,
      normalizationChanges: job.normalizationChanges,
      referenceQualityScore: job.referenceQualityScore,
      referenceTranscriptUsed: job.referenceTranscriptUsed,
      createdAt: job.createdAt
    },
    job.content
  );

  const target = safeJoin(jobsDir, `${job.id}.md`);
  const temporary = `${target}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporary, markdown, { encoding: "utf8", mode: 0o600 });
  await fs.rename(temporary, target);
  return job;
}

function jobFromMarkdown(content: string, fallbackId = ""): JobRecord {
  const parsed = parseMarkdown(content);
  return {
    id: parsed.frontmatter.id || fallbackId,
    scriptId: parsed.frontmatter.scriptId || "",
    title: parsed.frontmatter.title || "Untitled Script",
    provider: parsed.frontmatter.provider || "unknown",
    format: (parsed.frontmatter.format || "wav") as OutputFormat,
    speed: toNumber(parsed.frontmatter.speed, 1),
    emotion: (parsed.frontmatter.emotion || "neutral") as VoiceEmotion,
    status: parsed.frontmatter.status === "failed" ? "failed" : parsed.frontmatter.status === "generating" ? "generating" : "completed",
    audioFile: parsed.frontmatter.audioFile,
    rawAudioFile: parsed.frontmatter.rawAudioFile,
    error: parsed.frontmatter.error,
    completedChunks: toNumber(parsed.frontmatter.completedChunks, 0),
    totalChunks: toNumber(parsed.frontmatter.totalChunks, 0),
    progressMessage: parsed.frontmatter.progressMessage,
    voiceProfileId: parsed.frontmatter.voiceProfileId,
    lexiconRevision: parsed.frontmatter.lexiconRevision,
    normalizationChanges: toNumber(parsed.frontmatter.normalizationChanges, 0),
    referenceQualityScore: toNumber(parsed.frontmatter.referenceQualityScore, 0),
    referenceTranscriptUsed: parsed.frontmatter.referenceTranscriptUsed === "true",
    createdAt: parsed.frontmatter.createdAt || "",
    content: parsed.body
  } satisfies JobRecord;
}

export async function getJob(jobId: string): Promise<JobRecord | undefined> {
  if (!/^job_[a-zA-Z0-9_-]+$/.test(jobId)) return undefined;
  try {
    const content = await fs.readFile(safeJoin(jobsDir, `${jobId}.md`), "utf8");
    const job = jobFromMarkdown(content, jobId);
    return { ...job, review: await readListeningReview(job.id) };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function listJobs(limit = 20) {
  const files = await readMarkdownFiles(jobsDir);
  const jobs = files
    .map(({ content }) => jobFromMarkdown(content))
    .filter((job) => job.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
  return Promise.all(jobs.map(async (job) => ({ ...job, review: await readListeningReview(job.id) })));
}

export async function deleteJob(jobId: string) {
  await ensureDataDirs();

  if (!/^job_[a-zA-Z0-9_-]+$/.test(jobId)) {
    throw new Error("Invalid job id");
  }

  if ((await getJob(jobId))?.status === "generating") throw new Error("Cancel the active job before deleting it");
  const jobFilePath = safeJoin(jobsDir, `${jobId}.md`);
  const markdown = await fs.readFile(jobFilePath, "utf8");
  const parsed = parseMarkdown(markdown);
  const audioFile = parsed.frontmatter.audioFile;
  const rawAudioFile = parsed.frontmatter.rawAudioFile;

  await fs.unlink(jobFilePath);
  await deleteListeningReview(jobId);

  // Best-effort: resolve defensively (a malformed legacy filename would make safeJoin throw) and
  // ignore ENOENT, so a missing/odd audio reference can't fail the delete after the record is gone.
  const deleteOutput = async (filename: string | undefined) => {
    if (!filename) return false;
    let outputPath: string | undefined;
    try {
      outputPath = safeJoin(outputsDir, filename);
    } catch {
      return false;
    }
    try {
      await fs.unlink(outputPath);
      return true;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
      return false;
    }
  };

  const spoolDirectory = path.join(dataDir, "queue");
  for (const file of await fs.readdir(spoolDirectory).catch(() => [] as string[])) {
    if (!/^[a-f0-9-]+\.json$/.test(file)) continue;
    const location = safeJoin(spoolDirectory, file);
    try {
      const task = JSON.parse(await fs.readFile(location, "utf8"));
      if (task?.context?.baseJob?.id === jobId) await writeJson(location, { key: task.key, digest: task.digest, state: "done", deleted: true, result: { jobId }, context: { baseJob: { id: jobId } } });
    } catch { /* unrelated corrupt spool is preserved for operator review */ }
  }
  await fs.unlink(safeJoin(spoolDirectory, `${jobId}.cancel`)).catch(() => undefined);
  const audioDeleted = await deleteOutput(audioFile);
  await deleteOutput(rawAudioFile);

  return {
    jobId,
    audioFile,
    audioDeleted
  };
}
