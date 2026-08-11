const globalForCron = globalThis as unknown as { __cronStarted?: boolean };

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (globalForCron.__cronStarted) return;
  globalForCron.__cronStarted = true;

  const { startCronJobs } = await import("@/lib/cron");
  startCronJobs();
}
