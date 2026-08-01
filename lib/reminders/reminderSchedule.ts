import { format } from "date-fns";
import type { DeskSettings } from "@/types/tasks";

export const TWO_HOURLY_REMINDER_TIMES = [
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
] as const;

export function getReminderTimes(settings: DeskSettings) {
  const times = settings.reminderMode === "custom"
    ? settings.customReminderTimes
    : settings.reminderMode === "twoHourly"
    ? [...TWO_HOURLY_REMINDER_TIMES]
    : settings.morningEveningTimes;

  return [...new Set(times)].sort();
}

export function getLatestReminderSlot(
  settings: DeskSettings,
  now = new Date(),
) {
  const currentTime = format(now, "HH:mm");
  return getReminderTimes(settings).filter((time) => time <= currentTime).at(-1)
    ?? null;
}
