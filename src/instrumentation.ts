export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { ensureRecovery } = await import("./lib/services/job-queue");
  const { tickGenerationQueue } = await import("./lib/services/generation-service");
  await ensureRecovery();
  const timer = setInterval(() => { void tickGenerationQueue().catch(() => console.error("Job queue tick failed")); }, 3000);
  timer.unref();
}
