import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import {
  createBackup,
  mergeItems,
  parseBackup,
} from "@/lib/storage/backup";
import { migrateStoredData } from "@/lib/storage/migrations";
import { createWorkProcessStages } from "@/lib/dates/dateCalculations";
import type { PersonalItem, ProjectEventItem, WorkItem } from "@/types/tasks";

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
    expect(parsed.items[0].notes).toBe("");
  });

  it("保存备注、个人表格和项目事件类型", () => {
    const personal: PersonalItem = {
      id: "personal-table",
      module: "personal",
      title: "旅行准备",
      status: "active",
      urgency: "week",
      dueDate: "2026-08-09",
      notes: "记得确认住宿",
      table: Array.from({ length: 30 }, (_, row) =>
        Array.from({ length: 6 }, (_, column) => `${row + 1}-${column + 1}`)
      ),
      tableColumnWidths: [100, 110, 120, 130, 140, 150],
      createdAt: "2026-08-02T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
      completedAt: null,
    };
    const event: ProjectEventItem = {
      id: "social-event",
      module: "social",
      taskType: "event",
      title: "回复品牌邮件",
      status: "active",
      urgency: "urgent",
      dueDate: "2026-08-02",
      notes: "先确认报价",
      createdAt: "2026-08-02T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
      completedAt: null,
    };

    const parsed = parseBackup(JSON.stringify(
      createBackup([personal, event], DEFAULT_SETTINGS, []),
    ));
    expect(parsed.items[0].notes).toBe("记得确认住宿");
    expect(parsed.items[0].module === "personal" ? parsed.items[0].table : null)
      .toHaveLength(30);
    expect(parsed.items[0].module === "personal"
      ? parsed.items[0].tableColumnWidths
      : null).toEqual([100, 110, 120, 130, 140, 150]);
    expect(parsed.items[1]).toMatchObject({
      module: "social",
      taskType: "event",
      urgency: "urgent",
      notes: "先确认报价",
    });
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

  it("旧工作流程的统一截止日期迁移到当前阶段", () => {
    const stages = createWorkProcessStages().map((stage) => ({
      id: stage.id,
      name: stage.name,
      status: stage.status,
      completedAt: stage.completedAt,
    }));
    const legacyProcess = {
      id: "legacy-process",
      module: "work",
      workType: "process",
      title: "旧流程",
      status: "active",
      dueDate: "2026-08-20",
      currentStageId: stages[2].id,
      stages: stages.map((stage, index) => ({
        ...stage,
        status: index < 2 ? "completed" : index === 2 ? "active" : "waiting",
      })),
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-31T00:00:00.000Z",
      completedAt: null,
    };
    const backup = {
      version: "1.0.0",
      exportedAt: "2026-07-31T02:30:00.000Z",
      settings: DEFAULT_SETTINGS,
      pendingActions: [],
      items: [legacyProcess],
    };

    const parsed = parseBackup(JSON.stringify(backup));
    const item = parsed.items[0];
    expect(item.module === "work" && item.workType === "process"
      ? item.stages.map((stage) => stage.dueDate)
      : []).toEqual([null, null, "2026-08-20", null, null, null]);
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
