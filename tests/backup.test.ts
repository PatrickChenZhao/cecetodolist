import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import {
  createBackup,
  mergeItems,
  parseBackup,
} from "@/lib/storage/backup";
import { migrateStoredData } from "@/lib/storage/migrations";
import type { WorkItem } from "@/types/tasks";

function work(updatedAt = "2026-07-31T00:00:00.000Z"): WorkItem {
  return {
    id: "work-1",
    module: "work",
    workType: "event",
    title: "整理本周计划",
    status: "active",
    urgency: "week",
    dueDate: "2026-08-02",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt,
    completedAt: null,
  };
}

describe("JSON 备份", () => {
  it("正常导出并导入", () => {
    const backup = createBackup(
      [work()],
      DEFAULT_SETTINGS,
      [],
      new Date("2026-07-31T02:30:00.000Z"),
    );
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.items[0].title).toBe("整理本周计划");
  });

  it("非法 JSON 和重复 ID 被拒绝", () => {
    expect(() => parseBackup("{broken")).toThrow("有效的 JSON");
    const backup = createBackup([work(), work()], DEFAULT_SETTINGS, []);
    expect(() => parseBackup(JSON.stringify(backup))).toThrow("重复 ID");
  });

  it("旧的无版本数据可以迁移到 1.0.0", () => {
    expect(migrateStoredData({ items: [] })).toEqual({
      version: "1.0.0",
      items: [],
    });
  });

  it("旧工作项目导入时自动迁移为工作事件", () => {
    const legacyItem = {
      ...work(),
      workType: undefined,
      urgency: "today",
    };
    const backup = {
      version: "1.0.0",
      exportedAt: "2026-07-31T02:30:00.000Z",
      settings: DEFAULT_SETTINGS,
      pendingActions: [],
      items: [legacyItem],
    };

    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.items[0]).toMatchObject({
      module: "work",
      workType: "event",
      urgency: "urgent",
    });
  });

  it("旧设置缺少界面配色时自动使用蓝黑主题", () => {
    const backup = createBackup([work()], DEFAULT_SETTINGS, []);
    const legacySettings = { ...backup.settings } as Record<string, unknown>;
    delete legacySettings.interfaceTheme;

    const parsed = parseBackup(JSON.stringify({
      ...backup,
      settings: legacySettings,
    }));
    expect(parsed.settings.interfaceTheme).toBe("blueBlack");
  });

  it("合并重复 ID 时保留 updatedAt 更新的版本", () => {
    const current = work("2026-07-31T00:00:00.000Z");
    const incoming = {
      ...work("2026-08-01T00:00:00.000Z"),
      title: "更新后的标题",
    };
    expect(mergeItems([current], [incoming])[0].title).toBe("更新后的标题");
  });
});
