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
import { APP_NAME, MODULE_META } from "@/lib/constants";
import type { AppView } from "@/types/tasks";

const navigation = [
  { id: "today" as const, label: "今日", icon: CalendarDays },
  { id: "deadlineCalendar" as const, label: "Deadline 日历", icon: CalendarRange },
  { id: "work" as const, label: MODULE_META.work.label, icon: BriefcaseBusiness },
  { id: "social" as const, label: MODULE_META.social.label, icon: Video },
  {
    id: "advertising" as const,
    label: MODULE_META.advertising.label,
    icon: Megaphone,
  },
  { id: "personal" as const, label: MODULE_META.personal.label, icon: Leaf },
  { id: "reminders" as const, label: "提醒设置", icon: Bell },
  { id: "completed" as const, label: "已完成任务", icon: CheckCircle2 },
  { id: "backup" as const, label: "数据备份", icon: DatabaseBackup },
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
  const renderContent = (compact: boolean) => (
    <>
      <div className="sidebar-brand">
        {!compact && (
          <span className="brand-copy">
            <strong>{APP_NAME}</strong>
            <small>个人工作台</small>
          </span>
        )}
        <button
          className="icon-button sidebar-collapse desktop-only"
          onClick={onToggle}
          aria-label={compact ? "展开导航栏" : "收起导航栏"}
          title={compact ? "展开导航栏" : "收起导航栏"}
        >
          {compact ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="主要导航">
        {navigation.map((item, index) => {
          const Icon = item.icon;
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
                title={compact ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={1.9} />
                {!compact && <span>{item.label}</span>}
              </button>
            </div>
          );
        })}
      </nav>

      {!compact && (
        <div className="sidebar-foot">
          <span className="save-dot" />
          数据仅保存在此浏览器
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        className="mobile-menu-button mobile-only"
        onClick={onMobileOpen}
        aria-label="打开导航菜单"
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
          aria-label="关闭导航菜单"
          tabIndex={mobileOpen ? 0 : -1}
        />
        <aside className="sidebar mobile-sidebar">{renderContent(false)}</aside>
      </div>
    </>
  );
}
