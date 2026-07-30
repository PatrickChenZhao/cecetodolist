import { describe, expect, it } from "vitest";
import {
  advanceWorkflow,
  createWorkflowStages,
  dueDateForPersonal,
  dueDateForWork,
  effectiveStageStatus,
  recalculateWorkflowDates,
} from "@/lib/dates/dateCalculations";
import type { WorkflowItem } from "@/types/tasks";

const referenceDate = new Date(2026, 6, 31, 12, 0, 0);

describe("紧急程度日期", () => {
  it("计算今日、本周星期日和本月末", () => {
    expect(dueDateForWork("today", referenceDate)).toBe("2026-07-31");
    expect(dueDateForWork("week", referenceDate)).toBe("2026-08-02");
    expect(dueDateForWork("month", referenceDate)).toBe("2026-07-31");
  });

  it("个人生活不紧急事项没有截止日期", () => {
    expect(dueDateForPersonal("urgent", referenceDate)).toBe("2026-07-31");
    expect(dueDateForPersonal("week", referenceDate)).toBe("2026-08-02");
    expect(dueDateForPersonal("month", referenceDate)).toBe("2026-07-31");
    expect(dueDateForPersonal("notUrgent", referenceDate)).toBeNull();
  });
});

describe("阶段日期计算", () => {
  it("按 7、5、3 天生成自媒体流程", () => {
    const stages = createWorkflowStages("social", "2026-08-01");
    expect(stages.map((stage) => stage.dueDate)).toEqual([
      "2026-08-01",
      "2026-08-08",
      "2026-08-13",
      "2026-08-16",
    ]);
  });

  it("按 3、6、3、2 天生成广告流程", () => {
    const stages = createWorkflowStages("advertising", "2026-08-01");
    expect(stages.map((stage) => stage.dueDate)).toEqual([
      "2026-08-01",
      "2026-08-04",
      "2026-08-10",
      "2026-08-13",
      "2026-08-15",
    ]);
  });

  it("重新计算时保留手动日期，并从手动日期继续自动计算", () => {
    const stages = createWorkflowStages("social", "2026-08-01");
    const manuallyAdjusted = recalculateWorkflowDates(
      "social",
      stages,
      2,
      "2026-08-15",
    );
    const recalculated = recalculateWorkflowDates(
      "social",
      manuallyAdjusted,
      0,
      "2026-08-02",
    );

    expect(recalculated.map((stage) => stage.dueDate)).toEqual([
      "2026-08-02",
      "2026-08-09",
      "2026-08-15",
      "2026-08-18",
    ]);
    expect(recalculated[2].dateSource).toBe("manual");
    expect(recalculated[3].dateSource).toBe("automatic");
  });
});

describe("阶段推进", () => {
  function workflow(): WorkflowItem {
    const stages = createWorkflowStages("social", "2026-07-01");
    return {
      id: "workflow-1",
      module: "social",
      title: "Xcode 新手教程",
      status: "active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      completedAt: null,
      currentStageId: stages[0].id,
      stages,
    };
  }

  it("到期只显示 overdue，不自动推进", () => {
    const item = workflow();
    expect(
      effectiveStageStatus(item.stages[0], new Date(2026, 6, 31)),
    ).toBe("overdue");
    expect(item.currentStageId).toBe(item.stages[0].id);
    expect(item.stages[1].status).toBe("waiting");
  });

  it("不能完成等待中的未来阶段", () => {
    const item = workflow();
    const unchanged = advanceWorkflow(item, item.stages[2].id, referenceDate);
    expect(unchanged).toBe(item);
  });

  it("完成当前阶段后只激活下一阶段", () => {
    const item = workflow();
    const next = advanceWorkflow(item, item.stages[0].id, referenceDate);
    expect(next.stages[0].status).toBe("completed");
    expect(next.stages[1].status).toBe("active");
    expect(next.stages[2].status).toBe("waiting");
    expect(next.currentStageId).toBe(next.stages[1].id);
  });

  it("最后阶段完成后整个项目完成", () => {
    let item = workflow();
    for (let index = 0; index < item.stages.length; index += 1) {
      item = advanceWorkflow(
        item,
        item.currentStageId,
        new Date(2026, 7, index + 1),
      );
    }
    expect(item.status).toBe("completed");
    expect(item.completedAt).not.toBeNull();
  });
});
