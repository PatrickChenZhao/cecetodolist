import { describe, expect, it } from "vitest";
import {
  advanceWorkflow,
  createWorkProcessStages,
  createWorkflowStages,
  dueDateForPersonal,
  dueDateForWork,
  displayTaskCardDueDate,
  effectiveStageStatus,
  getItemDueDate,
  recalculateWorkflowDates,
  reopenCompletedTask,
  rewindWorkflowToStage,
} from "@/lib/dates/dateCalculations";
import type { WorkItem, WorkProcessItem, WorkflowItem } from "@/types/tasks";

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

  it("任务卡当天显示今天，其他日期显示 Due M/D", () => {
    expect(displayTaskCardDueDate("2026-07-31", referenceDate)).toBe("今天");
    expect(displayTaskCardDueDate("2026-08-01", referenceDate)).toBe("Due 8/1");
    expect(displayTaskCardDueDate("2026-12-09", referenceDate)).toBe("Due 12/9");
    expect(displayTaskCardDueDate(null, referenceDate)).toBe("无截止日期");
  });
});

describe("阶段日期计算", () => {
  it("工作流程只给 Brief 设置初始截止日期", () => {
    const stages = createWorkProcessStages("2026-08-20");
    expect(stages.map((stage) => stage.name)).toEqual([
      "Brief",
      "Response",
      "Book Media",
      "IMBA",
      "PCA",
      "Invoice",
    ]);
    expect(stages.map((stage) => stage.dueDate)).toEqual([
      "2026-08-20",
      null,
      null,
      null,
      null,
      null,
    ]);
  });

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

  it("可将任意流程阶段恢复为当前未完成阶段", () => {
    let item = workflow();
    item = advanceWorkflow(item, item.stages[0].id, referenceDate);
    item = advanceWorkflow(item, item.stages[1].id, referenceDate);

    const rewound = rewindWorkflowToStage(
      item,
      item.stages[0].id,
      new Date(2026, 7, 1, 12, 0, 0),
    );

    expect(rewound.status).toBe("active");
    expect(rewound.completedAt).toBeNull();
    expect(rewound.currentStageId).toBe(rewound.stages[0].id);
    expect(rewound.stages.map((stage) => stage.status)).toEqual([
      "active",
      "waiting",
      "waiting",
      "waiting",
    ]);
    expect(rewound.stages.every((stage) => stage.completedAt === null)).toBe(true);
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

  it("撤销已完成流程时重新打开最后阶段", () => {
    let item = workflow();
    for (let index = 0; index < item.stages.length; index += 1) {
      item = advanceWorkflow(
        item,
        item.currentStageId,
        new Date(2026, 7, index + 1),
      );
    }

    const reopened = reopenCompletedTask(item, referenceDate);
    const finalStage = reopened.stages[reopened.stages.length - 1];
    expect(reopened.status).toBe("active");
    expect(reopened.completedAt).toBeNull();
    expect(reopened.currentStageId).toBe(finalStage.id);
    expect(finalStage.status).toBe("active");
    expect(finalStage.completedAt).toBeNull();
    expect(reopened.stages[reopened.stages.length - 2].status).toBe("completed");
  });

  it("撤销普通已完成事项时恢复未完成状态", () => {
    const item: WorkItem = {
      id: "work-event-1",
      module: "work",
      workType: "event",
      title: "确认付款",
      status: "completed",
      urgency: "week",
      dueDate: "2026-08-02",
      createdAt: "2026-07-31T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      completedAt: "2026-08-01T00:00:00.000Z",
    };

    const reopened = reopenCompletedTask(item, referenceDate);
    expect(reopened.status).toBe("active");
    expect(reopened.completedAt).toBeNull();
  });

  it("工作流程选择下一阶段截止日期后才推进", () => {
    const stages = createWorkProcessStages("2026-08-20");
    const item: WorkProcessItem = {
      id: "work-process-1",
      module: "work",
      workType: "process",
      title: "Campaign launch",
      status: "active",
      dueDate: "2026-08-20",
      currentStageId: stages[0].id,
      stages,
      createdAt: "2026-07-31T00:00:00.000Z",
      updatedAt: "2026-07-31T00:00:00.000Z",
      completedAt: null,
    };

    expect(getItemDueDate(item)).toBe("2026-08-20");
    const unchanged = advanceWorkflow(item, item.currentStageId, referenceDate);
    expect(unchanged).toBe(item);

    const next = advanceWorkflow(
      item,
      item.currentStageId,
      referenceDate,
      "2026-08-25",
    );
    expect(next.stages[0].status).toBe("completed");
    expect(next.stages[1].status).toBe("active");
    expect(next.stages[1].dueDate).toBe("2026-08-25");
    expect(next.stages.slice(2).every((stage) => stage.dueDate === null)).toBe(true);
    expect(getItemDueDate(next)).toBe("2026-08-25");
    expect(next.currentStageId).toBe(next.stages[1].id);
  });
});
