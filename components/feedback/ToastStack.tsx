"use client";

import { RotateCcw, X } from "lucide-react";
import type { PendingAction } from "@/types/tasks";
import { useLanguage } from "@/context/LanguageContext";

export function ToastStack({
  actions,
  onUndo,
  onDismiss,
  now,
  avoidComposer,
}: {
  actions: PendingAction[];
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
  now: number;
  avoidComposer: boolean;
}) {
  const { language, tr } = useLanguage();
  const visible = actions.slice(-3).reverse();
  const hidden = actions.length - visible.length;

  return (
    <div
      className={`toast-stack ${avoidComposer ? "avoid-composer" : ""}`}
      aria-live="polite"
    >
      {hidden > 0 && (
        <div className="undo-toast summary-toast">
          <span>{tr(`还有 ${hidden} 个操作可撤销`, `${hidden} more actions can be undone`)}</span>
          <button
            onClick={() =>
              actions.slice(0, hidden).forEach((action) => onUndo(action.id))
            }
          >
            {tr("全部撤销", "Undo All")}
          </button>
        </div>
      )}
      {visible.map((action) => {
        const remaining = Math.max(
          0,
          now === 0
            ? 15
            : Math.ceil((new Date(action.expiresAt).getTime() - now) / 1000),
        );
        return (
          <div className="undo-toast" key={action.id}>
            <div className="undo-toast-copy">
              <span>{language === "en"
                ? action.type === "delete"
                  ? `Deleted “${action.itemSnapshot.title}”`
                  : action.type === "stage"
                    ? `Completed a stage in “${action.itemSnapshot.title}”`
                    : `Completed “${action.itemSnapshot.title}”`
                : action.label}</span>
              <small>{remaining}</small>
            </div>
            <button onClick={() => onUndo(action.id)}>
              <RotateCcw size={14} /> {tr("撤销", "Undo")}
            </button>
            <button
              className="undo-toast-close"
              onClick={() => onDismiss(action.id)}
              aria-label={tr(`关闭“${action.itemSnapshot.title}”的撤销提示`, `Dismiss undo notice for “${action.itemSnapshot.title}”`)}
              title={tr("关闭提示", "Dismiss")}
            >
              <X size={14} />
            </button>
            <span
              className="undo-progress"
              style={{
                transform: `scaleX(${remaining / 15})`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
