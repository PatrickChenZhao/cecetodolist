"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  Trash2,
  X,
} from "lucide-react";
import {
  MODULE_META,
  PERSONAL_URGENCY_LABELS,
  WORK_URGENCY_LABELS,
} from "@/lib/constants";
import {
  displayCompletedAt,
  dueDateForPersonal,
  dueDateForWork,
  effectiveStageStatus,
  getCurrentStage,
  recalculateWorkflowDates,
} from "@/lib/dates/dateCalculations";
import type {
  PersonalItem,
  TaskItem,
  WorkflowStage,
  WorkItem,
} from "@/types/tasks";

interface TaskDetailPanelProps {
  item: TaskItem;
  onClose: () => void;
  onSave: (item: TaskItem) => void;
  onComplete: (item: TaskItem) => void;
  onDelete: (item: TaskItem) => void;
}

export function TaskDetailPanel({
  item,
  onClose,
  onSave,
  onComplete,
  onDelete,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState(item.title);
  const [workUrgency, setWorkUrgency] =
    useState<WorkItem["urgency"]>(
      item.module === "work" ? item.urgency : "today",
    );
  const [personalUrgency, setPersonalUrgency] =
    useState<PersonalItem["urgency"]>(
      item.module === "personal" ? item.urgency : "week",
    );
  const [dueDate, setDueDate] = useState<string | null>(
    "dueDate" in item ? item.dueDate : null,
  );
  const [stages, setStages] = useState<WorkflowStage[]>(
    item.module === "social" || item.module === "advertising"
      ? item.stages.map((stage) => ({ ...stage }))
      : [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  const meta = MODULE_META[item.module];
  const workflow = item.module === "social" || item.module === "advertising"
    ? item
    : null;
  const currentStage = workflow ? getCurrentStage(workflow) : null;
  const completedCount = workflow
    ? workflow.stages.filter((stage) => stage.status === "completed").length
    : 0;

  function save() {
    if (!title.trim()) return;
    if (item.module === "work") {
      onSave({
        ...item,
        title: title.trim(),
        urgency: workUrgency,
        dueDate: dueDate ?? dueDateForWork(workUrgency),
      });
    } else if (item.module === "personal") {
      onSave({
        ...item,
        title: title.trim(),
        urgency: personalUrgency,
        dueDate,
      });
    } else {
      onSave({ ...item, title: title.trim(), stages });
    }
  }

  return (
    <div className="detail-layer" role="dialog" aria-modal="true">
      <button
        className="detail-backdrop"
        onClick={onClose}
        aria-label="关闭任务详情"
      />
      <aside
        className="detail-panel"
        style={{ "--module-color": meta.color } as React.CSSProperties}
      >
        <header className="detail-header">
          <div>
            <span className="module-kicker">
              <i style={{ background: meta.color }} />
              {meta.label}
            </span>
            <h2>任务详情</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="关闭详情"
          >
            <X size={19} />
          </button>
        </header>

        <div className="detail-content">
          <label className="detail-field">
            <span>标题</span>
            <textarea
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              rows={3}
            />
          </label>

          {item.module === "work" && (
            <>
              <div className="detail-field">
                <span>紧急程度</span>
                <div className="segmented-control">
                  {(Object.keys(WORK_URGENCY_LABELS) as WorkItem["urgency"][])
                    .map((urgency) => (
                      <button
                        key={urgency}
                        data-active={workUrgency === urgency}
                        onClick={() => {
                          setWorkUrgency(urgency);
                          setDueDate(dueDateForWork(urgency));
                        }}
                      >
                        {WORK_URGENCY_LABELS[urgency]}
                      </button>
                    ))}
                </div>
              </div>
              <label className="detail-field">
                <span>截止日期</span>
                <input
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </>
          )}

          {item.module === "personal" && (
            <>
              <div className="detail-field">
                <span>紧急程度</span>
                <div className="segmented-control wrap">
                  {(Object.keys(
                    PERSONAL_URGENCY_LABELS,
                  ) as PersonalItem["urgency"][]).map((urgency) => (
                    <button
                      key={urgency}
                      data-active={personalUrgency === urgency}
                      onClick={() => {
                        setPersonalUrgency(urgency);
                        setDueDate(dueDateForPersonal(urgency));
                      }}
                    >
                      {PERSONAL_URGENCY_LABELS[urgency]}
                    </button>
                  ))}
                </div>
              </div>
              <label className="detail-field">
                <span>截止日期</span>
                <input
                  type="date"
                  disabled={personalUrgency === "notUrgent"}
                  value={dueDate ?? ""}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </>
          )}

          {workflow && (
            <section className="detail-stages">
              <header>
                <div>
                  <span>整体进度</span>
                  <strong>{completedCount} / {workflow.stages.length}</strong>
                </div>
                <div className="detail-progress-track">
                  <span
                    style={{
                      width: `${(completedCount / workflow.stages.length) * 100}%`,
                    }}
                  />
                </div>
              </header>
              {stages.map((stage, index) => {
                const status = effectiveStageStatus(stage);
                const isCurrent = stage.id === workflow.currentStageId
                  && item.status === "active";
                return (
                  <div
                    className="detail-stage"
                    data-status={status}
                    key={stage.id}
                  >
                    <span className="detail-stage-icon">
                      {status === "completed"
                        ? <Check size={13} />
                        : <span />}
                    </span>
                    <div className="detail-stage-body">
                      <div>
                        <strong>{stage.name}</strong>
                        {isCurrent && <small>当前阶段</small>}
                      </div>
                      <label>
                        截止
                        <input
                          type="date"
                          value={stage.dueDate}
                          disabled={stage.status === "completed"}
                          onChange={(event) =>
                            setStages(
                              recalculateWorkflowDates(
                                workflow.module,
                                stages,
                                index,
                                event.target.value,
                              ),
                            )
                          }
                        />
                        {stage.status !== "completed" && index > 0 && (
                          <span>
                            {stage.dateSource === "automatic" ? "自动" : "已调整"}
                          </span>
                        )}
                      </label>
                      {stage.completedAt && (
                        <p>
                          <CheckCircle2 size={12} />
                          完成于 {displayCompletedAt(stage.completedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <div className="detail-audit">
            <span><Clock3 size={13} /> 创建于 {displayCompletedAt(item.createdAt)}</span>
            {item.completedAt && (
              <span>
                <CheckCircle2 size={13} />
                完成于 {displayCompletedAt(item.completedAt)}
              </span>
            )}
          </div>
        </div>

        <footer className="detail-footer">
          <button
            className="delete-button"
            onClick={() => {
              onDelete(item);
              onClose();
            }}
            title="删除事项"
          >
            <Trash2 size={15} /> 删除
          </button>
          <div>
            <button className="secondary-button" onClick={save}>
              保存修改
            </button>
            {item.status === "active" && (
              <button
                className="primary-button"
                onClick={() => {
                  save();
                  onComplete(item);
                  onClose();
                }}
              >
                <Check size={15} />
                {currentStage ? "完成当前阶段" : "完成"}
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
}
