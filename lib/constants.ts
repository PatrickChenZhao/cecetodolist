import type { DeskSettings, ModuleType } from "@/types/tasks";

export const APP_NAME = "Personal Desk";
export const DATA_VERSION = "1.0.0" as const;
export const DEFAULT_DASHBOARD_TITLE = "你好 Cecilia";

export const STORAGE_KEYS = {
  data: "personal-desk:data",
  settings: "personal-desk:settings",
  pendingActions: "personal-desk:pending-actions",
  notificationHistory: "personal-desk:notification-history",
} as const;

export const DEFAULT_SETTINGS: DeskSettings = {
  dashboardTitle: DEFAULT_DASHBOARD_TITLE,
  interfaceTheme: "blueBlack",
  language: "zh-CN",
  sidebarCollapsed: false,
  browserNotifications: false,
  reminderMode: "morningEvening",
  customReminderTimes: ["09:00"],
  morningEveningTimes: ["10:30", "16:30"],
};

export const MODULE_ORDER: ModuleType[] = [
  "work",
  "social",
  "advertising",
  "personal",
];

export const MODULE_META = {
  work: {
    label: "工作项目",
    shortLabel: "工作",
    color: "#5B8DEF",
    soft: "#EDF4FF",
    empty: "今天没有工作项目。",
    emptyAction: "添加一个任务",
  },
  social: {
    label: "自媒体日常",
    shortLabel: "自媒体",
    color: "#9B7AE8",
    soft: "#F4F0FF",
    empty: "今天没有需要推进的内容。",
    emptyAction: "创建一条内容",
  },
  advertising: {
    label: "广告项目",
    shortLabel: "广告",
    color: "#E89A5B",
    soft: "#FFF3E8",
    empty: "今天没有需要处理的广告项目。",
    emptyAction: "创建一个项目",
  },
  personal: {
    label: "个人生活",
    shortLabel: "生活",
    color: "#63B995",
    soft: "#EBF8F2",
    empty: "今天的生活事项已经处理完成。",
    emptyAction: "添加生活事项",
  },
} as const;

export const WORK_URGENCY_LABELS = {
  today: "今日",
  week: "本周",
  month: "本月",
} as const;

export const PERSONAL_URGENCY_LABELS = {
  urgent: "紧急",
  week: "这周",
  month: "这个月",
  notUrgent: "不紧急",
} as const;

export const SOCIAL_STAGE_NAMES = ["脚本", "完成拍摄", "剪完视频", "发布"];
export const AD_STAGE_NAMES = ["大纲", "脚本", "完成拍摄", "初稿", "发布"];
export const WORK_PROCESS_STAGE_NAMES = [
  "Brief",
  "Response",
  "Book Media",
  "IMBA",
  "PCA",
  "Invoice",
];
export const WORK_PROCESS_STAGE_SHORT_LABELS: Record<string, string> = {
  Response: "Respon",
  "Book Media": "BM",
};
export const UNDO_WINDOW_MS = 15_000;
