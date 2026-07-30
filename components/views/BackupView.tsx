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
  const inputRef = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<BackupPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const summary = incoming ? summarizeItems(incoming.items) : null;

  async function readFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      setIncoming(parseBackup(text));
    } catch (caught) {
      setIncoming(null);
      setError(caught instanceof Error ? caught.message : "无法读取备份文件。");
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
          <span className="eyebrow">你的数据，由你掌握</span>
          <h1>数据备份</h1>
          <p>导出完整 JSON，或从备份安全地替换、合并当前数据。</p>
        </div>
        <span className="view-icon"><DatabaseBackup size={22} /></span>
      </header>

      <div className="backup-hero">
        <div className="backup-status">
          <span><ShieldCheck size={23} /></span>
          <div>
            <strong>浏览器本地存储</strong>
            <p>
              {lastSavedAt
                ? `已自动保存 · ${new Date(lastSavedAt).toLocaleTimeString(
                    "zh-CN",
                    { hour: "2-digit", minute: "2-digit" },
                  )}`
                : "正在准备本地数据"}
            </p>
          </div>
        </div>
        <div className="backup-stats">
          <div><strong>{items.length}</strong><span>全部事项</span></div>
          <div>
            <strong>{items.filter((item) => item.status === "active").length}</strong>
            <span>进行中</span>
          </div>
          <div>
            <strong>
              {items.filter((item) => item.status === "completed").length}
            </strong>
            <span>已完成</span>
          </div>
        </div>
      </div>

      <div className="backup-actions-grid">
        <section className="backup-action-card">
          <span className="backup-action-icon"><Download size={21} /></span>
          <h2>导出 JSON 备份</h2>
          <p>包含所有任务、阶段历史、提醒设置和仍可撤销的操作。</p>
          <button className="primary-button wide" onClick={exportBackup}>
            <Download size={15} /> 导出完整备份
          </button>
        </section>

        <section className="backup-action-card">
          <span className="backup-action-icon"><Upload size={21} /></span>
          <h2>导入 JSON 备份</h2>
          <p>导入前会严格检查版本、日期、ID 和阶段结构。</p>
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
            <FileJson size={15} /> 选择备份文件
          </button>
        </section>
      </div>

      {error && (
        <div className="inline-error">
          <X size={17} />
          <div><strong>无法导入</strong><p>{error}</p></div>
          <button onClick={() => setError(null)} aria-label="关闭错误">
            <X size={15} />
          </button>
        </div>
      )}

      {incoming && summary && (
        <section className="import-review">
          <header>
            <div>
              <span className="eyebrow">文件验证通过</span>
              <h2>发现 {incoming.items.length} 个事项</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => setIncoming(null)}
              aria-label="取消导入"
            >
              <X size={17} />
            </button>
          </header>
          <div className="import-summary">
            {MODULE_ORDER.map((module) => (
              <div key={module}>
                <i style={{ background: MODULE_META[module].color }} />
                <span>{MODULE_META[module].label}</span>
                <strong>{summary[module]}</strong>
              </div>
            ))}
          </div>
          {confirmReplace ? (
            <div className="replace-confirmation">
              <div>
                <strong>确认替换当前全部数据？</strong>
                <p>当前数据会在内存中保留到操作完成；导入失败不会覆盖。</p>
              </div>
              <button
                className="secondary-button"
                onClick={() => setConfirmReplace(false)}
              >
                返回
              </button>
              <button
                className="danger-solid-button"
                onClick={() => {
                  onImport(incoming, "replace");
                  setIncoming(null);
                  setConfirmReplace(false);
                }}
              >
                确认替换
              </button>
            </div>
          ) : (
            <footer>
              <button
                className="secondary-button"
                onClick={() => setIncoming(null)}
              >
                取消
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  onImport(incoming, "merge");
                  setIncoming(null);
                }}
              >
                与当前数据合并
              </button>
              <button
                className="danger-outline-button"
                onClick={() => setConfirmReplace(true)}
              >
                替换当前数据
              </button>
            </footer>
          )}
        </section>
      )}
    </section>
  );
}
