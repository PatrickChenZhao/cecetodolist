import type { InterfaceLanguage, ModuleType } from "@/types/tasks";
import { MODULE_META } from "@/lib/constants";

const MODULE_ENGLISH: Record<ModuleType, {
  label: string;
  shortLabel: string;
  empty: string;
  emptyAction: string;
}> = {
  work: {
    label: "Work Projects",
    shortLabel: "Work",
    empty: "No work projects for today.",
    emptyAction: "Add a task",
  },
  social: {
    label: "Content Routine",
    shortLabel: "Content",
    empty: "No content needs attention today.",
    emptyAction: "Create content",
  },
  advertising: {
    label: "Ad Projects",
    shortLabel: "Ads",
    empty: "No ad projects need attention today.",
    emptyAction: "Create a project",
  },
  personal: {
    label: "Personal Life",
    shortLabel: "Personal",
    empty: "Everything personal is taken care of today.",
    emptyAction: "Add a personal task",
  },
};

const STAGE_ENGLISH: Record<string, string> = {
  "脚本": "Script",
  "完成拍摄": "Filming",
  "剪完视频": "Editing",
  "发布": "Publish",
  "大纲": "Outline",
  "初稿": "First Draft",
  "执行中": "In Progress",
};

export function moduleMeta(module: ModuleType, language: InterfaceLanguage) {
  const base = MODULE_META[module];
  return language === "en" ? { ...base, ...MODULE_ENGLISH[module] } : base;
}

export function stageLabel(name: string, language: InterfaceLanguage) {
  return language === "en" ? STAGE_ENGLISH[name] ?? name : name;
}

export function urgencyLabel(
  urgency: "urgent" | "week" | "month" | "notUrgent",
  language: InterfaceLanguage,
) {
  const labels = language === "en"
    ? { urgent: "Urgent", week: "This Week", month: "This Month", notUrgent: "Not Urgent" }
    : { urgent: "紧急", week: "这周", month: "这个月", notUrgent: "不紧急" };
  return labels[urgency];
}
