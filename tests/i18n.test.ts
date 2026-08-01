import { describe, expect, it } from "vitest";
import { settingsSchema } from "@/lib/validation/backupSchema";
import { displayDueDate, localDateLabel } from "@/lib/dates/dateCalculations";
import { moduleMeta, stageLabel, urgencyLabel } from "@/lib/i18n";

describe("interface language", () => {
  it("keeps old stored settings compatible by defaulting to Chinese", () => {
    const settings = settingsSchema.parse({
      dashboardTitle: "你好 Cecilia",
      interfaceTheme: "blueBlack",
      sidebarCollapsed: false,
      browserNotifications: false,
      reminderMode: "morningEvening",
      customReminderTimes: ["09:00"],
      morningEveningTimes: ["10:30", "16:30"],
    });

    expect(settings.language).toBe("zh-CN");
  });

  it("preserves English as a stored setting", () => {
    const settings = settingsSchema.parse({ language: "en" });
    expect(settings.language).toBe("en");
  });

  it("provides English module, stage, urgency, and date labels", () => {
    const now = new Date("2026-08-01T12:00:00");

    expect(moduleMeta("social", "en").label).toBe("Content Routine");
    expect(stageLabel("剪完视频", "en")).toBe("Editing");
    expect(urgencyLabel("notUrgent", "en")).toBe("Not Urgent");
    expect(displayDueDate("2026-08-01", now, "en")).toBe("Today");
    expect(localDateLabel(now, "en")).toBe("Saturday, August 1, 2026");
  });
});
