"use client";

import { RotateCcw } from "lucide-react";
import type { PendingAction } from "@/types/tasks";

export function ToastStack({
  actions,
  onUndo,
  now,
  avoidComposer,
}: {
  actions: PendingAction[];
  onUndo: (id: string) => void;
  now: number;
  avoidComposer: boolean;
}) {
  const visible = actions.slice(-3).reverse();
  const hidden = actions.length - visible.length;

  return (
    <div
      className={`toast-stack ${avoidComposer ? "avoid-composer" : ""}`}
      aria-live="polite"
    >
      {hidden > 0 && (
        <div className="undo-toast summary-toast">
          <span>还有 {hidden} 个操作可撤销</span>
          <button
            onClick={() =>
              actions.slice(0, hidden).forEach((action) => onUndo(action.id))
            }
          >
            全部撤销
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
              <span>{action.label}</span>
              <small>{remaining}</small>
            </div>
            <button onClick={() => onUndo(action.id)}>
              <RotateCcw size={14} /> 撤销
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
