"use client";

import { useState } from "react";
import {
  ArrowUp,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Leaf,
  Megaphone,
  Plus,
  Video,
} from "lucide-react";
import { PERSONAL_URGENCY_LABELS } from "@/lib/constants";
import { useLanguage } from "@/context/LanguageContext";
import { moduleMeta, stageLabel, urgencyLabel } from "@/lib/i18n";
import {
  createWorkProcessStages,
  createWorkflowStages,
  dueDateForPersonal,
  recalculateWorkflowDates,
  todayKey,
} from "@/lib/dates/dateCalculations";
import type {
  ModuleType,
  PersonalItem,
  ProjectEventItem,
  TaskItem,
  WorkItem,
  WorkProcessItem,
  WorkflowItem,
  WorkflowStage,
} from "@/types/tasks";

const icons = {
  work: BriefcaseBusiness,
  social: Video,
  advertising: Megaphone,
  personal: Leaf,
};

interface DynamicComposerProps {
  module: ModuleType;
  collapsed: boolean;
  onModuleChange: (module: ModuleType) => void;
  onCreate: (item: TaskItem) => void;
  onCollapsedChange: (collapsed: boolean) => void;
}

function baseItem(module: ModuleType, title: string) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    module,
    title: title.trim(),
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    notes: "",
  };
}

function WorkflowDates({
  module,
  stages,
  onChange,
}: {
  module: WorkflowItem["module"];
  stages: WorkflowStage[];
  onChange: (stages: WorkflowStage[]) => void;
}) {
  const { language, tr } = useLanguage();
  return (
    <div className="workflow-date-grid">
      {stages.map((stage, index) => (
        <label key={stage.id} className="date-field">
          <span>
            {stageLabel(stage.name, language)}
            {index > 0 && (
              <small data-source={stage.dateSource}>
                {stage.dateSource === "automatic" ? tr("自动", "Auto") : tr("已调整", "Adjusted")}
              </small>
            )}
          </span>
          <input
            type="date"
            value={stage.dueDate}
            onChange={(event) =>
              onChange(
                recalculateWorkflowDates(
                  module,
                  stages,
                  index,
                  event.target.value,
                ),
              )
            }
          />
        </label>
      ))}
    </div>
  );
}

export function DynamicComposer({
  module,
  collapsed,
  onModuleChange,
  onCreate,
  onCollapsedChange,
}: DynamicComposerProps) {
  const { language, tr } = useLanguage();
  const [workTitle, setWorkTitle] = useState("");
  const [workType, setWorkType] = useState<"process" | "event">("event");
  const [workUrgency, setWorkUrgency] =
    useState<WorkItem["urgency"]>("week");
  const [workProcessDueDate, setWorkProcessDueDate] = useState(todayKey());
  const [personalTitle, setPersonalTitle] = useState("");
  const [personalUrgency, setPersonalUrgency] =
    useState<PersonalItem["urgency"]>("week");
  const [socialTitle, setSocialTitle] = useState("");
  const [socialType, setSocialType] = useState<"process" | "event">("process");
  const [socialUrgency, setSocialUrgency] =
    useState<ProjectEventItem["urgency"]>("week");
  const [socialStages, setSocialStages] = useState(() =>
    createWorkflowStages("social", todayKey())
  );
  const [advertisingTitle, setAdvertisingTitle] = useState("");
  const [advertisingType, setAdvertisingType] =
    useState<"process" | "event">("process");
  const [advertisingUrgency, setAdvertisingUrgency] =
    useState<ProjectEventItem["urgency"]>("week");
  const [advertisingStages, setAdvertisingStages] = useState(() =>
    createWorkflowStages("advertising", todayKey())
  );
  const Icon = icons[module];
  const meta = moduleMeta(module, language);
  const selectedType = module === "work"
    ? workType
    : module === "social"
      ? socialType
      : module === "advertising"
        ? advertisingType
        : null;
  const selectedEventUrgency = module === "work"
    ? workUrgency
    : module === "social"
      ? socialUrgency
      : advertisingUrgency;

  function setSelectedType(type: "process" | "event") {
    if (module === "work") setWorkType(type);
    if (module === "social") setSocialType(type);
    if (module === "advertising") setAdvertisingType(type);
  }

  function setSelectedEventUrgency(urgency: ProjectEventItem["urgency"]) {
    if (module === "work") setWorkUrgency(urgency);
    if (module === "social") setSocialUrgency(urgency);
    if (module === "advertising") setAdvertisingUrgency(urgency);
  }

  const title = module === "work"
    ? workTitle
    : module === "personal"
      ? personalTitle
      : module === "social"
        ? socialTitle
        : advertisingTitle;

  function submit() {
    if (!title.trim()) return;
    if (module === "work" && workType === "process" && !workProcessDueDate) {
      return;
    }

    if (module === "work") {
      if (workType === "process") {
        const stages = createWorkProcessStages(workProcessDueDate);
        const item: WorkProcessItem = {
          ...baseItem("work", workTitle),
          module: "work",
          workType: "process",
          dueDate: workProcessDueDate,
          currentStageId: stages[0].id,
          stages,
        };
        onCreate(item);
      } else {
        onCreate({
          ...baseItem("work", workTitle),
          module: "work",
          workType: "event",
          urgency: workUrgency,
          dueDate: dueDateForPersonal(workUrgency),
        });
      }
      setWorkTitle("");
      return;
    }

    if (module === "personal") {
      onCreate({
        ...baseItem("personal", personalTitle),
        module: "personal",
        urgency: personalUrgency,
        dueDate: dueDateForPersonal(personalUrgency),
        table: null,
        tableColumnWidths: null,
      });
      setPersonalTitle("");
      return;
    }

    const projectType = module === "social" ? socialType : advertisingType;
    const projectUrgency = module === "social"
      ? socialUrgency
      : advertisingUrgency;
    if (projectType === "event") {
      const item: ProjectEventItem = {
        ...baseItem(module, title),
        module,
        taskType: "event",
        urgency: projectUrgency,
        dueDate: dueDateForPersonal(projectUrgency),
      };
      onCreate(item);
      if (module === "social") setSocialTitle("");
      else setAdvertisingTitle("");
      return;
    }

    const stages = module === "social" ? socialStages : advertisingStages;
    const item: WorkflowItem = {
      ...baseItem(module, title),
      module,
      taskType: "process",
      currentStageId: stages[0].id,
      stages: stages.map((stage, index) => ({
        ...stage,
        status: index === 0 ? "active" : "waiting",
        completedAt: null,
      })),
    };
    onCreate(item);
    if (module === "social") {
      setSocialTitle("");
      setSocialStages(createWorkflowStages("social", todayKey()));
    } else {
      setAdvertisingTitle("");
      setAdvertisingStages(createWorkflowStages("advertising", todayKey()));
    }
  }

  const input = (
    <textarea
      id="composer-title"
      value={title}
      rows={1}
      placeholder={
        module === "work"
          ? workType === "process"
            ? tr("输入工作流程名称……", "Enter a work process…")
            : tr("输入工作事件……", "Enter a work task…")
          : module === "social"
            ? selectedType === "process"
              ? tr("输入内容流程名称……", "Enter a content process…")
              : tr("输入自媒体事件……", "Enter a content task…")
            : module === "advertising"
              ? selectedType === "process"
                ? tr("输入广告流程名称……", "Enter an ad process…")
                : tr("输入广告事件……", "Enter an ad task…")
              : tr("输入生活事项……", "Enter a personal task…")
      }
      onChange={(event) => {
        const value = event.target.value;
        if (module === "work") setWorkTitle(value);
        if (module === "social") setSocialTitle(value);
        if (module === "advertising") setAdvertisingTitle(value);
        if (module === "personal") setPersonalTitle(value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          submit();
        }
      }}
      aria-label={tr("事项内容", "Task details")}
    />
  );

  return (
    <div className="composer-dock" data-collapsed={collapsed}>
      <div className="composer-stack">
        <div
          className="composer-expanded-shell"
          aria-hidden={collapsed}
          inert={collapsed ? true : undefined}
        >
          <section
            className="dynamic-composer"
            style={{
              "--module-color": meta.color,
              "--module-soft": meta.soft,
            } as React.CSSProperties}
          >
        <div className="composer-topline">
          <div className="composer-source-controls">
            <label className="module-select">
              <Icon size={16} />
              <select
                value={module}
                onChange={(event) =>
                  onModuleChange(event.target.value as ModuleType)
                }
                aria-label={tr("选择事项模块", "Choose task module")}
              >
                <option value="work">{moduleMeta("work", language).label}</option>
                <option value="social">{moduleMeta("social", language).label}</option>
                <option value="advertising">{moduleMeta("advertising", language).label}</option>
                <option value="personal">{moduleMeta("personal", language).label}</option>
              </select>
              <ChevronDown size={14} />
            </label>
            {module !== "personal" && (
              <div
                className="work-type-toggle"
                role="group"
                aria-label={tr(`${meta.label}类型`, `${meta.label} type`)}
              >
                <button
                  data-active={selectedType === "process"}
                  onClick={() => setSelectedType("process")}
                >
                  {tr("流程", "Process")}
                </button>
                <button
                  data-active={selectedType === "event"}
                  onClick={() => setSelectedType("event")}
                >
                  {tr("事件", "Task")}
                </button>
              </div>
            )}
          </div>
          <button
            className="composer-collapse-button"
            onClick={() => onCollapsedChange(true)}
            aria-label={tr("收起输入框", "Collapse composer")}
            title={tr("收起输入框", "Collapse composer")}
          >
            <ChevronDown size={17} />
          </button>
        </div>

        <div className="composer-title-input">{input}</div>

        {module !== "personal" && selectedType === "event" && (
          <div className="composer-options">
            <span className="option-label">{tr("紧急程度", "Urgency")}</span>
            <div className="segmented-control">
              {(Object.keys(
                PERSONAL_URGENCY_LABELS,
              ) as ProjectEventItem["urgency"][]).map(
                (urgency) => (
                  <button
                    key={urgency}
                    data-active={selectedEventUrgency === urgency}
                    onClick={() => setSelectedEventUrgency(urgency)}
                  >
                    {urgencyLabel(urgency, language)}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {module === "work" && workType === "process" && (
          <div className="work-process-options">
            <label className="date-field work-process-due-date">
              <span>{tr("Brief 截止日期", "Brief Due Date")}</span>
              <input
                type="date"
                required
                value={workProcessDueDate}
                onChange={(event) => setWorkProcessDueDate(event.target.value)}
              />
            </label>
          </div>
        )}

        {module === "personal" && (
          <div className="composer-options">
            <span className="option-label">{tr("紧急程度", "Urgency")}</span>
            <div className="segmented-control">
              {(Object.keys(
                PERSONAL_URGENCY_LABELS,
              ) as PersonalItem["urgency"][]).map((urgency) => (
                <button
                  key={urgency}
                  data-active={personalUrgency === urgency}
                  onClick={() => setPersonalUrgency(urgency)}
                >
                  {urgencyLabel(urgency, language)}
                </button>
              ))}
            </div>
          </div>
        )}

        {module === "social" && socialType === "process" && (
          <WorkflowDates
            module="social"
            stages={socialStages}
            onChange={setSocialStages}
          />
        )}

        {module === "advertising" && advertisingType === "process" && (
          <WorkflowDates
            module="advertising"
            stages={advertisingStages}
            onChange={setAdvertisingStages}
          />
        )}

        <div className="composer-actions">
          <span className="composer-shortcut">{tr("Enter 创建 · Shift + Enter 换行", "Enter to create · Shift + Enter for a new line")}</span>
          <div className="composer-primary-actions">
            <span className="composer-hint">
              <CalendarDays size={13} /> {tr("日期自动按本地时间保存", "Dates are saved in local time")}
            </span>
            <button
              className="create-button"
              onClick={submit}
              disabled={
                !title.trim()
                || (module === "work"
                  && workType === "process"
                  && !workProcessDueDate)
              }
            >
              {tr("创建", "Create")} <ArrowUp size={15} />
            </button>
          </div>
        </div>
          </section>
        </div>
        <button
          className="composer-collapsed-bar"
          onClick={() => onCollapsedChange(false)}
          aria-label={tr("展开输入框", "Expand composer")}
          title={tr("展开输入框", "Expand composer")}
          aria-hidden={!collapsed}
          tabIndex={collapsed ? 0 : -1}
        >
          <Plus size={24} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
