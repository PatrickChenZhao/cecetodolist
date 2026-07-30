import { describe, expect, it } from "vitest";
import { sortTasks } from "@/lib/dates/sorting";
import type { PersonalItem, WorkItem } from "@/types/tasks";

function work(
  id: string,
  dueDate: string,
  createdAt: string,
): WorkItem {
  return {
    id,
    module: "work",
    title: id,
    status: "active",
    urgency: "today",
    dueDate,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
  };
}

function noDate(id: string): PersonalItem {
  return {
    id,
    module: "personal",
    title: id,
    status: "active",
    urgency: "notUrgent",
    dueDate: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    completedAt: null,
  };
}

describe("任务排序", () => {
  it("超时优先、日期更早优先、无日期最后", () => {
    const sorted = sortTasks(
      [
        noDate("无日期"),
        work("本周", "2026-08-02", "2026-07-01T00:00:00.000Z"),
        work("已超时", "2026-07-30", "2026-07-02T00:00:00.000Z"),
        work("今天", "2026-07-31", "2026-07-03T00:00:00.000Z"),
      ],
      new Date(2026, 6, 31, 12),
    );
    expect(sorted.map((item) => item.id)).toEqual([
      "已超时",
      "今天",
      "本周",
      "无日期",
    ]);
  });

  it("相同日期按创建时间从早到晚", () => {
    const sorted = sortTasks([
      work("后创建", "2026-08-02", "2026-07-02T00:00:00.000Z"),
      work("先创建", "2026-08-02", "2026-07-01T00:00:00.000Z"),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["先创建", "后创建"]);
  });
});
