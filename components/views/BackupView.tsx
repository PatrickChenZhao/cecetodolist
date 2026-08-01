"use client";

import { useRef, useState } from "react";
import {
  DatabaseBackup,
  Download,
  FileJson,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { MODULE_META, MODULE_ORDER } from "@/lib/constants";
import {
  backupFilename,
  createBackup,
  parseBackup,
  summarizeItems,
} from "@/lib/storage/backup";
import { downloadJson } from "@/lib/storage/storage";
import type {
  BackupPayload,
  DeskSettings,
  PendingAction,
  TaskItem,
} from "@/types/tasks";
import { useLanguage } from "@/context/LanguageContext";
import { moduleMeta } from "@/lib/i18n";

export function BackupView({
  items,
  settings,
  pendingActions,
  onImport,
  lastSavedAt,
}: {
  items: TaskItem[];
  settings: DeskSettings;
  pendingActions: PendingAction[];
  onImport: (
    payload: BackupPayload,
    mode: "replace" | "merge",
  ) => void;
  lastSavedAt: string | null;
}) {
  const { language, tr } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<BackupPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const summary = incoming ? summarizeItems(incoming.items) : null;
  const displayedError = language === "en" && error && /[\u3400-\u9fff]/.test(error)
    ? "The backup file is invalid or incompatible."
    : error;

  async function readFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      setIncoming(parseBackup(text));
    } catch (caught) {
      setIncoming(null);
      setError(caught instanceof Error ? caught.message : tr("无法读取备份文件。", "Unable to read the backup file."));
    }
  }

  function exportBackup() {
    const backup = createBackup(items, settings, pendingActions);
    downloadJson(backup, backupFilename());
  }

  return (
    <section className="page-view">
      <header className="view-header">
        <div>
          <span className="eyebrow">{tr("你的数据，由你掌握", "Your Data, Your Control")}</span>
          <h1>{tr("数据备份", "Data Backup")}</h1>
          <p>{tr("导出完整 JSON，或从备份安全地替换、合并当前数据。", "Export a complete JSON backup, or safely replace or merge your current data.")}</p>
        </div>
        <span className="view-icon"><DatabaseBackup size={22} /></span>
      </header>

      <div className="backup-hero">
        <div className="backup-status">
          <span><ShieldCheck size={23} /></span>
          <div>
            <strong>{tr("浏览器本地存储", "Browser Local Storage")}</strong>
            <p>
              {lastSavedAt
                ? `${tr("已自动保存", "Autosaved")} · ${new Date(lastSavedAt).toLocaleTimeString(
                    language,
                    { hour: "2-digit", minute: "2-digit" },
                  )}`
                : tr("正在准备本地数据", "Preparing local data")}
            </p>
          </div>
        </div>
        <div className="backup-stats">
          <div><strong>{items.length}</strong><span>{tr("全部事项", "All Items")}</span></div>
          <div>
            <strong>{items.filter((item) => item.status === "active").length}</strong>
            <span>{tr("进行中", "Active")}</span>
          </div>
          <div>
            <strong>
              {items.filter((item) => item.status === "completed").length}
            </strong>
            <span>{tr("已完成", "Completed")}</span>
          </div>
        </div>
      </div>

      <div className="backup-actions-grid">
        <section className="backup-action-card">
          <span className="backup-action-icon"><Download size={21} /></span>
          <h2>{tr("导出 JSON 备份", "Export JSON Backup")}</h2>
          <p>{tr("包含所有任务、阶段历史、提醒设置和仍可撤销的操作。", "Includes all tasks, stage history, reminder settings, and undoable actions.")}</p>
          <button className="primary-button wide" onClick={exportBackup}>
            <Download size={15} /> {tr("导出完整备份", "Export Full Backup")}
          </button>
        </section>

        <section className="backup-action-card">
          <span className="backup-action-icon"><Upload size={21} /></span>
          <h2>{tr("导入 JSON 备份", "Import JSON Backup")}</h2>
          <p>{tr("导入前会严格检查版本、日期、ID 和阶段结构。", "Version, dates, IDs, and stage structure are validated before import.")}</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
              event.target.value = "";
            }}
          />
          <button
            className="secondary-button wide"
            onClick={() => inputRef.current?.click()}
          >
            <FileJson size={15} /> {tr("选择备份文件", "Choose Backup File")}
          </button>
        </section>
      </div>

      {error && (
        <div className="inline-error">
          <X size={17} />
          <div><strong>{tr("无法导入", "Import Failed")}</strong><p>{displayedError}</p></div>
          <button onClick={() => setError(null)} aria-label={tr("关闭错误", "Dismiss error")}>
            <X size={15} />
          </button>
        </div>
      )}

      {incoming && summary && (
        <section className="import-review">
          <header>
            <div>
              <span className="eyebrow">{tr("文件验证通过", "File Validated")}</span>
              <h2>{tr(`发现 ${incoming.items.length} 个事项`, `${incoming.items.length} items found`)}</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => setIncoming(null)}
              aria-label={tr("取消导入", "Cancel import")}
            >
              <X size={17} />
            </button>
          </header>
          <div className="import-summary">
            {MODULE_ORDER.map((module) => (
              <div key={module}>
                <i style={{ background: MODULE_META[module].color }} />
                <span>{moduleMeta(module, language).label}</span>
                <strong>{summary[module]}</strong>
              </div>
            ))}
          </div>
          {confirmReplace ? (
            <div className="replace-confirmation">
              <div>
                <strong>{tr("确认替换当前全部数据？", "Replace all current data?")}</strong>
                <p>{tr("当前数据会在内存中保留到操作完成；导入失败不会覆盖。", "Current data stays in memory until the operation completes; a failed import will not overwrite it.")}</p>
              </div>
              <button
                className="secondary-button"
                onClick={() => setConfirmReplace(false)}
              >
                {tr("返回", "Back")}
              </button>
              <button
                className="danger-solid-button"
                onClick={() => {
                  onImport(incoming, "replace");
                  setIncoming(null);
                  setConfirmReplace(false);
                }}
              >
                {tr("确认替换", "Confirm Replace")}
              </button>
            </div>
          ) : (
            <footer>
              <button
                className="secondary-button"
                onClick={() => setIncoming(null)}
              >
                {tr("取消", "Cancel")}
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  onImport(incoming, "merge");
                  setIncoming(null);
                }}
              >
                {tr("与当前数据合并", "Merge with Current Data")}
              </button>
              <button
                className="danger-outline-button"
                onClick={() => setConfirmReplace(true)}
              >
                {tr("替换当前数据", "Replace Current Data")}
              </button>
            </footer>
          )}
        </section>
      )}
    </section>
  );
}
