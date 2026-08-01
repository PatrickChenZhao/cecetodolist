"use client";

import {
  Bell,
  BriefcaseBusiness,
  CalendarRange,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  Leaf,
  Megaphone,
  Menu,
  Video,
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { useLanguage } from "@/context/LanguageContext";
import { moduleMeta } from "@/lib/i18n";
import type { AppView } from "@/types/tasks";

const navigation = [
  { id: "today" as const, icon: CalendarDays },
  { id: "deadlineCalendar" as const, icon: CalendarRange },
  { id: "work" as const, icon: BriefcaseBusiness },
  { id: "social" as const, icon: Video },
  {
    id: "advertising" as const,
    icon: Megaphone,
  },
  { id: "personal" as const, icon: Leaf },
  { id: "reminders" as const, icon: Bell },
  { id: "completed" as const, icon: CheckCircle2 },
  { id: "backup" as const, icon: DatabaseBackup },
];

interface SidebarProps {
  view: AppView;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (view: AppView) => void;
  onToggle: () => void;
  onMobileClose: () => void;
  onMobileOpen: () => void;
}

export function Sidebar({
  view,
  collapsed,
  mobileOpen,
  onNavigate,
  onToggle,
  onMobileClose,
  onMobileOpen,
}: SidebarProps) {
  const { language, tr } = useLanguage();
  const navigationLabel = (id: AppView) => {
    if (id === "today") return tr("今日", "Today");
    if (id === "deadlineCalendar") return tr("Deadline 日历", "Deadline Calendar");
    if (id === "reminders") return tr("提醒设置", "Message Settings");
    if (id === "completed") return tr("已完成任务", "Completed Tasks");
    if (id === "backup") return tr("数据备份", "Data Backup");
    return moduleMeta(id, language).label;
  };
  const renderContent = (compact: boolean) => (
    <>
      <div className="sidebar-brand">
        {!compact && (
          <span className="brand-copy">
            <strong>{APP_NAME}</strong>
            <small>{tr("个人工作台", "Personal Workspace")}</small>
          </span>
        )}
        <button
          className="icon-button sidebar-collapse desktop-only"
          onClick={onToggle}
          aria-label={compact ? tr("展开导航栏", "Expand sidebar") : tr("收起导航栏", "Collapse sidebar")}
          title={compact ? tr("展开导航栏", "Expand sidebar") : tr("收起导航栏", "Collapse sidebar")}
        >
          {compact ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label={tr("主要导航", "Main navigation")}>
        {navigation.map((item, index) => {
          const Icon = item.icon;
          const label = navigationLabel(item.id);
          const separator = index === 2 || index === 6;
          return (
            <div key={item.id} className={separator ? "nav-group-start" : ""}>
              <button
                className="nav-item"
                data-active={view === item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onMobileClose();
                }}
                aria-current={view === item.id ? "page" : undefined}
                title={compact ? label : undefined}
              >
                <Icon size={18} strokeWidth={1.9} />
                {!compact && <span>{label}</span>}
              </button>
            </div>
          );
        })}
      </nav>

      {!compact && (
        <div className="sidebar-foot">
          <span className="save-dot" />
          {tr("数据仅保存在此浏览器", "Data is stored only in this browser")}
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        className="mobile-menu-button mobile-only"
        onClick={onMobileOpen}
        aria-label={tr("打开导航菜单", "Open navigation menu")}
      >
        <Menu size={20} />
      </button>

      <aside
        className={`sidebar desktop-sidebar ${collapsed ? "is-collapsed" : ""}`}
      >
        {renderContent(collapsed)}
      </aside>

      <div className={`mobile-sidebar-layer ${mobileOpen ? "is-open" : ""}`}>
        <button
          className="mobile-backdrop"
          onClick={onMobileClose}
          aria-label={tr("关闭导航菜单", "Close navigation menu")}
          tabIndex={mobileOpen ? 0 : -1}
        />
        <aside className="sidebar mobile-sidebar">{renderContent(false)}</aside>
      </div>
    </>
  );
}
