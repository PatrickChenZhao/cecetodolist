import { describe, expect, it } from "vitest";
import {
  createPendingAction,
  isPendingExpired,
  purgeExpiredActions,
  restorePendingAction,
} from "@/lib/undo/actions";
import type { WorkItem } from "@/types/tasks";

const item: WorkItem = {
  id: "work-1",
  module: "work",
  workType: "event",
  title: "完成训练详情页面",
  status: "active",
  urgency: "urgent",
  dueDate: "2026-07-31",
  createdAt: "2026-07-31T00:00:00.000Z",
  updatedAt: "2026-07-31T00:00:00.000Z",
  completedAt: null,
};

describe("15 秒撤销", () => {
  const start = new Date("2026-07-31T02:00:00.000Z");

  it("15 秒内保留，超过后过期", () => {
    const action = createPendingAction("delete", item, "已删除", start);
    expect(isPendingExpired(action, new Date(start.getTime() + 14_999))).toBe(false);
    expect(isPendingExpired(action, new Date(start.getTime() + 15_000))).toBe(true);
  });

  it("删除后可以恢复完整事项", () => {
    const action = createPendingAction("delete", item, "已删除", start);
    expect(restorePendingAction([], action)).toEqual([item]);
  });

  it("多个撤销操作互不覆盖", () => {
    const first = createPendingAction("delete", item, "第一次", start);
    const second = createPendingAction(
      "complete",
      { ...item, id: "work-2" },
      "第二次",
      new Date(start.getTime() + 1000),
    );
    expect(first.id).not.toBe(second.id);
    expect(
      purgeExpiredActions(
        [first, second],
        new Date(start.getTime() + 15_500),
      ).map((action) => action.id),
    ).toEqual([second.id]);
  });
});
