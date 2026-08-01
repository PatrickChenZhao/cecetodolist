"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Palette,
  Repeat2,
  ShieldAlert,
  SunMoon,
  X,
} from "lucide-react";
import { MODULE_META, MODULE_ORDER } from "@/lib/constants";
import {
  displayDueDate,
  getCurrentStage,
  getItemDueDate,
  isDueWithinNextDays,
} from "@/lib/dates/dateCalculations";
import { sortTasks } from "@/lib/dates/sorting";
import { TWO_HOURLY_REMINDER_TIMES } from "@/lib/reminders/reminderSchedule";
import type { DeskSettings, TaskItem } from "@/types/tasks";

const CUSTOM_TIME_DEFAULTS = [
  "09:00",
  "11:00",
  "13:00",
  "15:00",
  "17:00",
  "19:00",
];

function getAttentionStageLabel(item: TaskItem) {
  if (item.module === "personal") return null;
  if (item.module === "work" && item.workType === "event") return "执行中";
  return getCurrentStage(item).name;
}

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
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | "unsupported"
  >(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [draftTimes, setDraftTimes] = useState(settings.customReminderTimes);
  const attentionItems = useMemo(
    () => sortTasks(items.filter((item) => isDueWithinNextDays(item))),
    [items],
  );
  const customTimesAreValid = draftTimes.every((time) =>
    /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  ) && new Set(draftTimes).size === draftTimes.length;

  useEffect(() => {
    function refreshPermission() {
      setPermissionState(
        typeof Notification === "undefined"
          ? "unsupported"
          : Notification.permission,
      );
    }
    window.addEventListener("focus", refreshPermission);
    return () => window.removeEventListener("focus", refreshPermission);
  }, []);

  async function toggleBrowserNotifications(enabled: boolean) {
    if (!enabled) {
      onSettingsChange({ browserNotifications: false });
      return;
    }
    if (typeof Notification === "undefined") {
      setPermissionState("unsupported");
      onSettingsChange({ browserNotifications: false });
      return;
    }

    const result = Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
    setPermissionState(result);
    onSettingsChange({ browserNotifications: result === "granted" });
  }

  function openTimeEditor(count: number) {
    const nextTimes = Array.from(
      { length: count },
      (_, index) => settings.customReminderTimes[index]
        ?? CUSTOM_TIME_DEFAULTS[index],
    );
    setDraftTimes(nextTimes);
    setTimeEditorOpen(true);
  }

  function saveCustomTimes() {
    if (!customTimesAreValid) return;
    onSettingsChange({
      reminderMode: "custom",
      customReminderTimes: [...draftTimes].sort(),
    });
    setTimeEditorOpen(false);
  }

  const notificationChecked = settings.browserNotifications
    && permissionState === "granted";

  return (
    <section className="page-view reminders-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">保持节奏</span>
          <h1>提醒设置</h1>
          <p>设置每天的提醒节奏，并集中查看未来三天需要完成的事项。</p>
        </div>
        <span className="view-icon"><BellRing size={22} /></span>
      </header>

      <div className="settings-grid reminder-settings-grid">
        <section className="settings-card theme-settings-card">
          <header>
            <span><Palette size={18} /></span>
            <div>
              <h2>界面配色</h2>
              <p>选择工作台的背景和窗口风格。</p>
            </div>
          </header>
          <div className="theme-options" role="radiogroup" aria-label="界面配色">
            {([
              ["blueBlack", "蓝黑", "深色背景与玻璃窗口"],
              ["bright", "明亮", "浅色背景与明亮窗口"],
            ] as const).map(([value, label, description]) => (
              <button
                key={value}
                className="theme-option"
                data-active={settings.interfaceTheme === value}
                onClick={() => onSettingsChange({ interfaceTheme: value })}
                role="radio"
                aria-checked={settings.interfaceTheme === value}
              >
                <span className="theme-preview" data-theme-preview={value}>
                  <i />
                  <b />
                  <b />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <i className="theme-selected-dot" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card notification-settings-card">
          <header>
            <span><Bell size={18} /></span>
            <div>
              <h2>浏览器通知</h2>
              <p>允许此浏览器按设置的时间发送提醒。</p>
            </div>
          </header>
          <label className="switch-row browser-notification-switch">
            <span>
              <strong>允许浏览器开启通知</strong>
              <small>
                {permissionState === "granted"
                  ? notificationChecked ? "通知已开启" : "浏览器已授权，当前已关闭"
                  : permissionState === "denied"
                  ? "权限已被拒绝，请前往浏览器站点设置修改"
                  : permissionState === "unsupported"
                  ? "当前浏览器不支持系统通知"
                  : "开启时浏览器会请求通知权限"}
              </small>
            </span>
            <input
              type="checkbox"
              checked={notificationChecked}
              disabled={permissionState === "unsupported"}
              onChange={(event) =>
                void toggleBrowserNotifications(event.target.checked)
              }
            />
            <i aria-hidden="true" />
          </label>
          <div className="notification-permission-state" data-state={permissionState}>
            {permissionState === "granted"
              ? <CheckCircle2 size={16} />
              : <ShieldAlert size={16} />}
            <span>通知仅在本设备、当前浏览器及网站打开时生效。</span>
          </div>
        </section>

        <section className="settings-card reminder-schedule-card">
          <header>
            <span><Clock3 size={18} /></span>
            <div>
              <h2>今日提醒设置</h2>
              <p>选择一种每日提醒节奏，系统会按对应时间提醒近三天事项。</p>
            </div>
          </header>

          <div className="reminder-mode-grid" role="radiogroup" aria-label="今日提醒模式">
            <section className="reminder-mode-option" data-active={settings.reminderMode === "custom"}>
              <label>
                <input
                  type="radio"
                  name="reminder-mode"
                  checked={settings.reminderMode === "custom"}
                  onChange={() => onSettingsChange({ reminderMode: "custom" })}
                />
                <CalendarDays size={17} />
                <span><strong>模式一</strong><small>每天自定义提醒</small></span>
              </label>
              <div className="custom-reminder-control">
                <span>每天</span>
                <select
                  aria-label="每天提醒次数"
                  value={settings.customReminderTimes.length}
                  onChange={(event) => openTimeEditor(Number(event.target.value))}
                >
                  {CUSTOM_TIME_DEFAULTS.map((_, index) => (
                    <option key={index + 1} value={index + 1}>{index + 1}</option>
                  ))}
                </select>
                <span>次</span>
                <button type="button" onClick={() => openTimeEditor(settings.customReminderTimes.length)}>
                  设置时间
                </button>
              </div>
              <div className="reminder-time-chips">
                {settings.customReminderTimes.map((time) => <span key={time}>{time}</span>)}
              </div>
            </section>

            <section className="reminder-mode-option" data-active={settings.reminderMode === "twoHourly"}>
              <label>
                <input
                  type="radio"
                  name="reminder-mode"
                  checked={settings.reminderMode === "twoHourly"}
                  onChange={() => onSettingsChange({ reminderMode: "twoHourly" })}
                />
                <Repeat2 size={17} />
                <span><strong>模式二</strong><small>每隔 2 小时提醒一次</small></span>
              </label>
              <div className="reminder-time-chips compact">
                {TWO_HOURLY_REMINDER_TIMES.map((time) => <span key={time}>{time}</span>)}
              </div>
            </section>

            <section className="reminder-mode-option" data-active={settings.reminderMode === "morningEvening"}>
              <label>
                <input
                  type="radio"
                  name="reminder-mode"
                  checked={settings.reminderMode === "morningEvening"}
                  onChange={() => onSettingsChange({ reminderMode: "morningEvening" })}
                />
                <SunMoon size={17} />
                <span><strong>模式三</strong><small>早晚各提醒一次</small></span>
              </label>
              <div className="morning-evening-times">
                <label>
                  <span>早上</span>
                  <input
                    type="time"
                    value={settings.morningEveningTimes[0]}
                    onFocus={() => onSettingsChange({ reminderMode: "morningEvening" })}
                    onChange={(event) => onSettingsChange({
                      reminderMode: "morningEvening",
                      morningEveningTimes: [
                        event.target.value,
                        settings.morningEveningTimes[1],
                      ],
                    })}
                  />
                </label>
                <label>
                  <span>下午</span>
                  <input
                    type="time"
                    value={settings.morningEveningTimes[1]}
                    onFocus={() => onSettingsChange({ reminderMode: "morningEvening" })}
                    onChange={(event) => onSettingsChange({
                      reminderMode: "morningEvening",
                      morningEveningTimes: [
                        settings.morningEveningTimes[0],
                        event.target.value,
                      ],
                    })}
                  />
                </label>
              </div>
            </section>
          </div>
        </section>

        <section className="settings-card attention-card">
          <header>
            <span><BellRing size={18} /></span>
            <div>
              <h2>现在需要关注的事件</h2>
              <p>{attentionItems.length} 个事项需要在今天起三天内完成。</p>
            </div>
          </header>
          {attentionItems.length === 0 ? (
            <p className="quiet-message">未来三天没有需要完成的事项。</p>
          ) : (
            <div className="attention-groups">
              {MODULE_ORDER.map((module) => {
                const moduleItems = attentionItems.filter((item) => item.module === module);
                return (
                  <section className="attention-group" key={module}>
                    <header>
                      <i style={{ background: MODULE_META[module].color }} />
                      <strong>{MODULE_META[module].label}</strong>
                      <span>{moduleItems.length}</span>
                    </header>
                    <div className="due-list">
                      {moduleItems.length === 0 ? (
                        <p>暂无事项</p>
                      ) : moduleItems.map((item) => {
                        const stageLabel = getAttentionStageLabel(item);
                        return (
                          <button key={item.id} onClick={() => onOpen(item)}>
                            <i style={{ background: MODULE_META[item.module].color }} />
                            <span className="attention-item-copy">
                              <strong>{item.title}</strong>
                              {stageLabel && <em>当前阶段：{stageLabel}</em>}
                            </span>
                            <small>{displayDueDate(getItemDueDate(item))}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {timeEditorOpen && (
        <div className="reminder-time-dialog-layer" role="presentation">
          <button
            className="reminder-time-dialog-backdrop"
            aria-label="关闭时间设置"
            onClick={() => setTimeEditorOpen(false)}
          />
          <section className="reminder-time-dialog" role="dialog" aria-modal="true" aria-labelledby="reminder-time-title">
            <header>
              <div>
                <h2 id="reminder-time-title">设置每日提醒时间</h2>
                <p>已选择每天提醒 {draftTimes.length} 次，请分别设置时间。</p>
              </div>
              <button aria-label="关闭" onClick={() => setTimeEditorOpen(false)}><X size={17} /></button>
            </header>
            <div className="reminder-time-inputs">
              {draftTimes.map((time, index) => (
                <label key={index}>
                  <span>第 {index + 1} 次</span>
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setDraftTimes((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index ? event.target.value : entry
                      )
                    )}
                  />
                </label>
              ))}
            </div>
            {!customTimesAreValid && <p className="reminder-time-error">每个提醒时间必须有效且不能重复。</p>}
            <footer>
              <button className="secondary-button" onClick={() => setTimeEditorOpen(false)}>取消</button>
              <button className="primary-button" disabled={!customTimesAreValid} onClick={saveCustomTimes}>保存时间</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
