"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock3,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import {
  MODULE_META,
  PERSONAL_URGENCY_LABELS,
} from "@/lib/constants";
import {
  displayCompletedAt,
  dueDateForPersonal,
  effectiveStageStatus,
  getCurrentStage,
  isWorkflowTask,
  recalculateWorkflowDates,
  rewindWorkflowToStage,
  todayKey,
} from "@/lib/dates/dateCalculations";
import type {
  AnyWorkflowStage,
  EventUrgency,
  TaskItem,
  WorkProcessStage,
  WorkflowStage,
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
  const workEvent = item.module === "work" && item.workType === "event"
    ? item
    : null;
  const workProcess = item.module === "work" && item.workType === "process"
    ? item
    : null;
  const eventItem = item.module === "personal" ? item : workEvent;
  const workflow = isWorkflowTask(item) ? item : null;
  const initialWorkProcessStage = workProcess
    ? getCurrentStage(workProcess)
    : null;
  const [title, setTitle] = useState(item.title);
  const [eventUrgency, setEventUrgency] = useState<EventUrgency>(
    eventItem?.urgency ?? "week",
  );
  const [dueDate, setDueDate] = useState<string | null>(
    workProcess
      ? initialWorkProcessStage?.dueDate ?? null
      : "dueDate" in item
        ? item.dueDate
        : null,
  );
  const [stages, setStages] = useState<AnyWorkflowStage[]>(
    workflow
      ? workflow.stages.map((stage) => ({ ...stage }))
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
  const currentStage = workflow ? getCurrentStage(workflow) : null;
  const completedCount = workflow
    ? workflow.stages.filter((stage) => stage.status === "completed").length
    : 0;

  function save() {
    if (!title.trim()) return;
    if (workEvent) {
      onSave({
        ...workEvent,
        title: title.trim(),
        urgency: eventUrgency,
        dueDate,
      });
    } else if (workProcess) {
      const nextStages = stages.map((stage) =>
        stage.id === workProcess.currentStageId
          ? { ...stage, dueDate }
          : stage
      ) as WorkProcessStage[];
      onSave({
        ...workProcess,
        title: title.trim(),
        dueDate: dueDate ?? todayKey(),
        stages: nextStages,
      });
    } else if (item.module === "personal") {
      onSave({
        ...item,
        title: title.trim(),
        urgency: eventUrgency,
        dueDate,
      });
    } else if (workflow) {
      onSave({
        ...workflow,
        title: title.trim(),
        stages: stages as WorkflowStage[],
      });
    }
  }

  function returnStageToIncomplete(stageId: string) {
    if (!workflow) return;

    const draft = workProcess
      ? {
          ...workProcess,
          title: title.trim() || workProcess.title,
          dueDate: dueDate ?? todayKey(),
          stages: stages as WorkProcessStage[],
        }
      : {
          ...workflow,
          title: title.trim() || workflow.title,
          stages: stages as WorkflowStage[],
        };
    const rewound = rewindWorkflowToStage(draft, stageId);
    setStages(rewound.stages.map((stage) => ({ ...stage })));
    if (rewound.module === "work") {
      setDueDate(getCurrentStage(rewound)?.dueDate ?? null);
    }
    onSave(rewound);
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

          {eventItem && (
            <>
              <div className="detail-field">
                <span>紧急程度</span>
                <div className="segmented-control wrap">
                  {(Object.keys(PERSONAL_URGENCY_LABELS) as EventUrgency[])
                    .map((urgency) => (
                      <button
                        key={urgency}
                        data-active={eventUrgency === urgency}
                        onClick={() => {
                          setEventUrgency(urgency);
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
                  disabled={eventUrgency === "notUrgent"}
                  value={dueDate ?? ""}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            </>
          )}

          {workProcess && (
            <label className="detail-field">
              <span>当前阶段截止日期</span>
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </label>
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
                      {workflow.module !== "work" && "dateSource" in stage && (
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
                                  stages as WorkflowStage[],
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
                      )}
                      {stage.completedAt && (
                        <p>
                          <CheckCircle2 size={12} />
                          完成于 {displayCompletedAt(stage.completedAt)}
                        </p>
                      )}
                    </div>
                    <button
                      className="detail-stage-rewind"
                      type="button"
                      onClick={() => returnStageToIncomplete(stage.id)}
                      aria-label={`${stage.name}回到未完成状态`}
                    >
                      <RotateCcw size={11} />
                      回到未完成状态
                    </button>
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
