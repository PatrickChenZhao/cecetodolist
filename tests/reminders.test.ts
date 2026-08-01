import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { isDueWithinNextDays } from "@/lib/dates/dateCalculations";
import {
  getLatestReminderSlot,
  getReminderTimes,
  TWO_HOURLY_REMINDER_TIMES,
} from "@/lib/reminders/reminderSchedule";
import type { DeskSettings, WorkItem } from "@/types/tasks";

function settings(patch: Partial<DeskSettings>): DeskSettings {
  return { ...DEFAULT_SETTINGS, ...patch };
}

function work(dueDate: string): WorkItem {
  return {
    id: `work-${dueDate}`,
    module: "work",
    workType: "event",
    title: "提醒测试事项",
    status: "active",
    urgency: "week",
    dueDate,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    completedAt: null,
  };
}

describe("每日提醒时间", () => {
  it("模式一使用用户设置的多个时间并自动排序", () => {
    expect(getReminderTimes(settings({
      reminderMode: "custom",
      customReminderTimes: ["17:30", "09:15", "12:00"],
    }))).toEqual(["09:15", "12:00", "17:30"]);
  });

  it("模式二固定在 8 点至 22 点每两小时提醒", () => {
    expect(getReminderTimes(settings({ reminderMode: "twoHourly" })))
      .toEqual([...TWO_HOURLY_REMINDER_TIMES]);
  });

  it("模式三默认采用 10:30 和 16:30，并找到当前最近时段", () => {
    const current = settings({ reminderMode: "morningEvening" });
    expect(getReminderTimes(current)).toEqual(["10:30", "16:30"]);
    expect(getLatestReminderSlot(current, new Date(2026, 7, 1, 16, 45)))
      .toBe("16:30");
  });
});

describe("未来三天关注事项", () => {
  const now = new Date(2026, 7, 1, 12, 0);

  it("包含今天、明天和后天截止的进行中事项", () => {
    expect(isDueWithinNextDays(work("2026-08-01"), 3, now)).toBe(true);
    expect(isDueWithinNextDays(work("2026-08-02"), 3, now)).toBe(true);
    expect(isDueWithinNextDays(work("2026-08-03"), 3, now)).toBe(true);
  });

  it("不包含已超时或第三天之后截止的事项", () => {
    expect(isDueWithinNextDays(work("2026-07-31"), 3, now)).toBe(false);
    expect(isDueWithinNextDays(work("2026-08-04"), 3, now)).toBe(false);
  });
});
