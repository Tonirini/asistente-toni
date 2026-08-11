import { schedule } from "node-cron";
import { runReminderEngine } from "@/lib/cron/reminders";
import {
  resetDailyCycles,
  resetMonthlyCycles,
  resetWeeklyCycles,
} from "@/lib/cron/recurrence";

const TIMEZONE = "America/Argentina/Cordoba";

export function startCronJobs() {
  schedule(
    "*/15 * * * *",
    () => runReminderEngine().catch((err) => console.error("[cron] reminders", err)),
    { timezone: TIMEZONE, name: "reminders" }
  );

  schedule(
    "0 0 * * *",
    () => resetDailyCycles().catch((err) => console.error("[cron] daily reset", err)),
    { timezone: TIMEZONE, name: "reset-daily" }
  );

  schedule(
    "0 0 * * 1",
    () => resetWeeklyCycles().catch((err) => console.error("[cron] weekly reset", err)),
    { timezone: TIMEZONE, name: "reset-weekly" }
  );

  schedule(
    "0 0 1 * *",
    () => resetMonthlyCycles().catch((err) => console.error("[cron] monthly reset", err)),
    { timezone: TIMEZONE, name: "reset-monthly" }
  );

  console.log("[cron] jobs registrados");
}
