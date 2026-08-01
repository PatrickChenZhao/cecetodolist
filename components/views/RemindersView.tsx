"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Languages,
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
import { useLanguage } from "@/context/LanguageContext";
import { moduleMeta, stageLabel } from "@/lib/i18n";
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

function getAttentionStageLabel(item: TaskItem, language: DeskSettings["language"]) {
  if (item.module === "personal") return null;
  if (item.module === "work" && item.workType === "event") {
    return language === "en" ? "In Progress" : "执行中";
  }
  return stageLabel(getCurrentStage(item).name, language);
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
  const { language, tr } = useLanguage();
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
          <span className="eyebrow">{tr("保持节奏", "Stay on Track")}</span>
          <h1>{tr("提醒设置", "Message Settings")}</h1>
          <p>{tr("设置每天的提醒节奏，并集中查看未来三天需要完成的事项。", "Set your daily reminder rhythm and review everything due in the next three days.")}</p>
        </div>
        <span className="view-icon"><BellRing size={22} /></span>
      </header>

      <div className="settings-grid reminder-settings-grid">
        <section className="settings-card theme-settings-card">
          <header>
            <span><Palette size={18} /></span>
            <div>
              <h2>{tr("界面配色", "Appearance")}</h2>
              <p>{tr("选择工作台的背景和窗口风格。", "Choose the workspace background and window style.")}</p>
            </div>
          </header>
          <div className="theme-options" role="radiogroup" aria-label={tr("界面配色", "Appearance")}>
            {([
              ["blueBlack", tr("蓝黑", "Midnight"), tr("深色背景与玻璃窗口", "Dark background with glass panels")],
              ["bright", tr("明亮", "Bright"), tr("浅色背景与明亮窗口", "Light background with bright panels")],
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

        <section className="settings-card language-settings-card">
          <header>
            <span><Languages size={18} /></span>
            <div>
              <h2>{tr("界面语言", "Language")}</h2>
              <p>{tr("切换整个工作台的显示语言。", "Change the language used across the workspace.")}</p>
            </div>
          </header>
          <div className="language-options" role="radiogroup" aria-label={tr("界面语言", "Interface language")}>
            {([
              ["zh-CN", "中文", "简体中文"],
              ["en", "English", "English (US)"],
            ] as const).map(([value, label, description]) => (
              <button
                key={value}
                className="language-option"
                data-active={settings.language === value}
                onClick={() => onSettingsChange({ language: value })}
                role="radio"
                aria-checked={settings.language === value}
              >
                <strong>{label}</strong>
                <small>{description}</small>
                <i aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="settings-card notification-settings-card">
          <header>
            <span><Bell size={18} /></span>
            <div>
              <h2>{tr("浏览器通知", "Browser Notifications")}</h2>
              <p>{tr("允许此浏览器按设置的时间发送提醒。", "Allow this browser to send reminders at your chosen times.")}</p>
            </div>
          </header>
          <label className="switch-row browser-notification-switch">
            <span>
              <strong>{tr("允许浏览器开启通知", "Allow browser notifications")}</strong>
              <small>
                {permissionState === "granted"
                  ? notificationChecked ? tr("通知已开启", "Notifications are on") : tr("浏览器已授权，当前已关闭", "Permission granted; notifications are off")
                  : permissionState === "denied"
                  ? tr("权限已被拒绝，请前往浏览器站点设置修改", "Permission denied. Update it in your browser's site settings.")
                  : permissionState === "unsupported"
                  ? tr("当前浏览器不支持系统通知", "This browser does not support system notifications")
                  : tr("开启时浏览器会请求通知权限", "Your browser will ask for notification permission")}
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
            <span>{tr("通知仅在本设备、当前浏览器及网站打开时生效。", "Notifications work only on this device, in this browser, while the site is open.")}</span>
          </div>
        </section>

        <section className="settings-card reminder-schedule-card">
          <header>
            <span><Clock3 size={18} /></span>
            <div>
              <h2>{tr("今日提醒设置", "Daily Reminder Schedule")}</h2>
              <p>{tr("选择一种每日提醒节奏，系统会按对应时间提醒近三天事项。", "Choose a daily rhythm for reminders about items due in the next three days.")}</p>
            </div>
          </header>

          <div className="reminder-mode-grid" role="radiogroup" aria-label={tr("今日提醒模式", "Daily reminder mode")}>
            <section className="reminder-mode-option" data-active={settings.reminderMode === "custom"}>
              <label>
                <input
                  type="radio"
                  name="reminder-mode"
                  checked={settings.reminderMode === "custom"}
                  onChange={() => onSettingsChange({ reminderMode: "custom" })}
                />
                <CalendarDays size={17} />
                <span><strong>{tr("模式一", "Custom")}</strong><small>{tr("每天自定义提醒", "Choose your own daily times")}</small></span>
              </label>
              <div className="custom-reminder-control">
                <span>{tr("每天", "Daily")}</span>
                <select
                  aria-label={tr("每天提醒次数", "Daily reminder count")}
                  value={settings.customReminderTimes.length}
                  onChange={(event) => openTimeEditor(Number(event.target.value))}
                >
                  {CUSTOM_TIME_DEFAULTS.map((_, index) => (
                    <option key={index + 1} value={index + 1}>{index + 1}</option>
                  ))}
                </select>
                <span>{tr("次", "times")}</span>
                <button type="button" onClick={() => openTimeEditor(settings.customReminderTimes.length)}>
                  {tr("设置时间", "Set times")}
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
                <span><strong>{tr("模式二", "Every 2 Hours")}</strong><small>{tr("每隔 2 小时提醒一次", "Send a reminder every two hours")}</small></span>
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
                <span><strong>{tr("模式三", "Morning & Afternoon")}</strong><small>{tr("早晚各提醒一次", "One reminder in the morning and afternoon")}</small></span>
              </label>
              <div className="morning-evening-times">
                <label>
                  <span>{tr("早上", "Morning")}</span>
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
                  <span>{tr("下午", "Afternoon")}</span>
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
              <h2>{tr("现在需要关注的事件", "Needs Your Attention")}</h2>
              <p>{tr(`${attentionItems.length} 个事项需要在今天起三天内完成。`, `${attentionItems.length} items are due within the next three days.`)}</p>
            </div>
          </header>
          {attentionItems.length === 0 ? (
            <p className="quiet-message">{tr("未来三天没有需要完成的事项。", "Nothing is due in the next three days.")}</p>
          ) : (
            <div className="attention-groups">
              {MODULE_ORDER.map((module) => {
                const moduleItems = attentionItems.filter((item) => item.module === module);
                return (
                  <section className="attention-group" key={module}>
                    <header>
                      <i style={{ background: MODULE_META[module].color }} />
                      <strong>{moduleMeta(module, language).label}</strong>
                      <span>{moduleItems.length}</span>
                    </header>
                    <div className="due-list">
                      {moduleItems.length === 0 ? (
                        <p>{tr("暂无事项", "No items")}</p>
                      ) : moduleItems.map((item) => {
                        const currentStageLabel = getAttentionStageLabel(item, language);
                        return (
                          <button key={item.id} onClick={() => onOpen(item)}>
                            <i style={{ background: MODULE_META[item.module].color }} />
                            <span className="attention-item-copy">
                              <strong>{item.title}</strong>
                              {currentStageLabel && <em>{tr("当前阶段：", "Current stage: ")}{currentStageLabel}</em>}
                            </span>
                            <small>{displayDueDate(getItemDueDate(item), new Date(), language)}</small>
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
            aria-label={tr("关闭时间设置", "Close time settings")}
            onClick={() => setTimeEditorOpen(false)}
          />
          <section className="reminder-time-dialog" role="dialog" aria-modal="true" aria-labelledby="reminder-time-title">
            <header>
              <div>
                <h2 id="reminder-time-title">{tr("设置每日提醒时间", "Set Daily Reminder Times")}</h2>
                <p>{tr(`已选择每天提醒 ${draftTimes.length} 次，请分别设置时间。`, `${draftTimes.length} daily reminders selected. Set a time for each one.`)}</p>
              </div>
              <button aria-label={tr("关闭", "Close")} onClick={() => setTimeEditorOpen(false)}><X size={17} /></button>
            </header>
            <div className="reminder-time-inputs">
              {draftTimes.map((time, index) => (
                <label key={index}>
                  <span>{tr(`第 ${index + 1} 次`, `Reminder ${index + 1}`)}</span>
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
            {!customTimesAreValid && <p className="reminder-time-error">{tr("每个提醒时间必须有效且不能重复。", "Each reminder time must be valid and unique.")}</p>}
            <footer>
              <button className="secondary-button" onClick={() => setTimeEditorOpen(false)}>{tr("取消", "Cancel")}</button>
              <button className="primary-button" disabled={!customTimesAreValid} onClick={saveCustomTimes}>{tr("保存时间", "Save Times")}</button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
