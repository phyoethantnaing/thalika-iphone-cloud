/** Where this Studio's GPU runs. Kaggle is the supported host; no provider API key is used. */
export function gpuHostStatus() {
  const deadline = process.env.THALIKA_SESSION_DEADLINE;
  return {
    host: process.env.THALIKA_GPU_HOST === "kaggle" ? "kaggle" as const : "local" as const,
    dashboardUrl: "https://www.kaggle.com/code",
    sessionEndsAt: deadline && !Number.isNaN(Date.parse(deadline)) ? new Date(deadline).toISOString() : null,
  };
}
