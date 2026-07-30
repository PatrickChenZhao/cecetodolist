"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock3,
  ShieldAlert,
} from "lucide-react";
import { MODULE_META } from "@/lib/constants";
import {
  displayDueDate,
  getItemDueDate,
  isDueForAttention,
} from "@/lib/dates/dateCalculations";
import type { DeskSettings, TaskItem } from "@/types/tasks";

export function RemindersView({
  items,
  settings,
  onSettingsChange,
  onOpen,
}: {
  items: TaskItem[];
  settings: DeskSettings;
  onSettingsChange: (patch: Partial<DeskSettings>) => void;
  onOpen: (item: TaskItem) => void;
}) {
  const [permissionState, setPermissionState] = useState(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const dueItems = useMemo(
    () => items.filter((item) => isDueForAttention(item)),
    [items],
  );

  async function requestPermission() {
    if (typeof Notification === "undefined") {
      setPermissionState("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermissionState(result);
    onSettingsChange({ browserNotifications: result === "granted" });
  }

  return (
    <section className="page-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">保持节奏</span>
          <h1>提醒设置</h1>
          <p>仅提醒当前需要推进的任务或阶段，不打扰未来阶段。</p>
        </div>
        <span className="view-icon"><BellRing size={22} /></span>
      </header>

      <div className="settings-grid">
        <section className="settings-card">
          <header>
            <span><Bell size={18} /></span>
            <div>
              <h2>全局设置</h2>
              <p>控制 Personal Desk 的全部提醒。</p>
            </div>
          </header>
          <label className="switch-row">
            <span>
              <strong>提醒功能</strong>
              <small>{settings.remindersEnabled ? "已开启" : "已关闭"}</small>
            </span>
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={(event) =>
                onSettingsChange({ remindersEnabled: event.target.checked })
              }
            />
            <i aria-hidden="true" />
          </label>
          <label className="switch-row">
            <span>
              <strong>超时每日提醒</strong>
              <small>只提醒仍在进行的当前阶段</small>
            </span>
            <input
              type="checkbox"
              checked={settings.overdueDaily}
              onChange={(event) =>
                onSettingsChange({ overdueDaily: event.target.checked })
              }
            />
            <i aria-hidden="true" />
          </label>
        </section>

        <section className="settings-card">
          <header>
            <span><ShieldAlert size={18} /></span>
            <div>
              <h2>浏览器通知</h2>
              <p>通知只在此设备和浏览器中显示。</p>
            </div>
          </header>
          <div className="permission-box" data-state={permissionState}>
            {permissionState === "granted" ? (
              <>
                <CheckCircle2 size={18} />
                <span>浏览器通知已允许</span>
              </>
            ) : permissionState === "denied" ? (
              <>
                <ShieldAlert size={18} />
                <span>通知权限已被浏览器拒绝，请在站点设置中更改。</span>
              </>
            ) : permissionState === "unsupported" ? (
              <>
                <ShieldAlert size={18} />
                <span>当前浏览器不支持通知。</span>
              </>
            ) : (
              <>
                <Bell size={18} />
                <span>允许后，截止当天可收到系统通知。</span>
              </>
            )}
          </div>
          {permissionState === "default" && (
            <button className="primary-button wide" onClick={requestPermission}>
              允许通知
            </button>
          )}
        </section>

        <section className="settings-card">
          <header>
            <span><Clock3 size={18} /></span>
            <div>
              <h2>默认提醒</h2>
              <p>新任务默认采用的提醒时间。</p>
            </div>
          </header>
          <div className="radio-stack">
            {[
              ["dueDay", "截止当天上午 9:00"],
              ["dayBefore", "提前 1 天"],
              ["hourBefore", "提前 1 小时"],
              ["none", "不提前"],
            ].map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="default-reminder"
                  value={value}
                  checked={settings.defaultReminder === value}
                  onChange={() =>
                    onSettingsChange({
                      defaultReminder: value as DeskSettings["defaultReminder"],
                    })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-card due-card">
          <header>
            <span><BellRing size={18} /></span>
            <div>
              <h2>现在需要关注</h2>
              <p>{dueItems.length} 个事项今天截止或已经超时。</p>
            </div>
          </header>
          <div className="due-list">
            {dueItems.length === 0 ? (
              <p className="quiet-message">目前没有需要提醒的事项。</p>
            ) : dueItems.slice(0, 5).map((item) => (
              <button key={item.id} onClick={() => onOpen(item)}>
                <i style={{ background: MODULE_META[item.module].color }} />
                <span>{item.title}</span>
                <small>{displayDueDate(getItemDueDate(item))}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
