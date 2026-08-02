import { describe, expect, it } from "vitest";
import {
  calendarMonthDays,
  collectDeadlineEntries,
  earliestDeadlineMonth,
} from "@/lib/dates/deadlineCalendar";
import { createWorkProcessStages, createWorkflowStages } from "@/lib/dates/dateCalculations";
import type { TaskItem, WorkProcessItem, WorkflowItem } from "@/types/tasks";

const base = {
  status: "active" as const,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  completedAt: null,
};

describe("deadline 日历", () => {
  it("普通任务和每个未完成流程阶段分别进入对应日期", () => {
    const stages = createWorkflowStages("social", "2026-08-04");
    const workflow: WorkflowItem = {
      ...base,
      id: "social-1",
      module: "social",
      title: "开学季内容",
      currentStageId: stages[0].id,
      stages,
    };
    const personal: TaskItem = {
      ...base,
      id: "personal-1",
      module: "personal",
      title: "预约体检",
      urgency: "week",
      dueDate: "2026-09-18",
    };

    const entries = collectDeadlineEntries([workflow, personal]);
    expect(entries.map((entry) => entry.date)).toEqual([
      "2026-08-04",
      "2026-08-11",
      "2026-08-16",
      "2026-08-19",
      "2026-09-18",
    ]);
    expect(entries[0]).toMatchObject({
      title: "脚本",
      workflowName: "开学季内容",
    });
    expect(earliestDeadlineMonth(entries)).toEqual(new Date(2026, 7, 1));
  });

  it("工作流程只把当前阶段的截止日期加入日历", () => {
    const stages = createWorkProcessStages("2026-08-20");
    const process: WorkProcessItem = {
      ...base,
      id: "work-process-1",
      module: "work",
      workType: "process",
      title: "Campaign launch",
      dueDate: "2026-08-20",
      currentStageId: stages[0].id,
      stages,
    };

    expect(collectDeadlineEntries([process])).toHaveLength(1);
    expect(collectDeadlineEntries([process])[0]).toMatchObject({
      date: "2026-08-20",
      title: "Brief",
      workflowName: "Campaign launch",
    });
    expect(stages.slice(1).every((stage) => stage.dueDate === null)).toBe(true);
  });

  it("自媒体和广告事件按事项截止日期加入日历", () => {
    const event: TaskItem = {
      ...base,
      id: "ad-event-1",
      module: "advertising",
      taskType: "event",
      title: "确认投放预算",
      urgency: "week",
      dueDate: "2026-08-09",
    };

    expect(collectDeadlineEntries([event])[0]).toMatchObject({
      date: "2026-08-09",
      title: "确认投放预算",
      workflowName: null,
    });
  });

  it("月份使用周一开始的真实日历网格", () => {
    const days = calendarMonthDays(new Date(2026, 7, 1));
    expect(days[0]).toEqual(new Date(2026, 6, 27));
    expect(days.at(-1)).toEqual(new Date(2026, 8, 6));
    expect(days.length).toBe(42);
  });
});
