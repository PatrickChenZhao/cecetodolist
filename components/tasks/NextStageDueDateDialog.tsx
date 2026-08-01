"use client";

import { CalendarDays, X } from "lucide-react";
import { useEffect, useState } from "react";
import { todayKey } from "@/lib/dates/dateCalculations";

interface NextStageDueDateDialogProps {
  currentStageName: string;
  nextStageName: string;
  onCancel: () => void;
  onConfirm: (dueDate: string) => void;
}

export function NextStageDueDateDialog({
  currentStageName,
  nextStageName,
  onCancel,
  onConfirm,
}: NextStageDueDateDialogProps) {
  const [dueDate, setDueDate] = useState(todayKey());

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  return (
    <div className="next-stage-date-layer" role="dialog" aria-modal="true">
      <button
        className="next-stage-date-backdrop"
        onClick={onCancel}
        aria-label="关闭截止日期选择"
      />
      <section className="next-stage-date-dialog">
        <header>
          <span className="next-stage-date-icon"><CalendarDays size={17} /></span>
          <div>
            <small>已准备完成 {currentStageName}</small>
            <h2>设置 {nextStageName} 的截止日期</h2>
          </div>
          <button className="icon-button" onClick={onCancel} aria-label="关闭">
            <X size={17} />
          </button>
        </header>
        <label>
          <span>截止日期</span>
          <input
            type="date"
            required
            autoFocus
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        <p>确认后，{nextStageName} 将成为当前阶段并加入截止日期日历。</p>
        <footer>
          <button className="secondary-button" onClick={onCancel}>取消</button>
          <button
            className="primary-button"
            disabled={!dueDate}
            onClick={() => onConfirm(dueDate)}
          >
            确认并进入 {nextStageName}
          </button>
        </footer>
      </section>
    </div>
  );
}
