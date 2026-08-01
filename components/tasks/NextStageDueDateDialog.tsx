"use client";

import { CalendarDays, X } from "lucide-react";
import { useEffect, useState } from "react";
import { todayKey } from "@/lib/dates/dateCalculations";
import { useLanguage } from "@/context/LanguageContext";
import { stageLabel } from "@/lib/i18n";

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
  const { language, tr } = useLanguage();
  const currentLabel = stageLabel(currentStageName, language);
  const nextLabel = stageLabel(nextStageName, language);
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
        aria-label={tr("关闭截止日期选择", "Close due date selection")}
      />
      <section className="next-stage-date-dialog">
        <header>
          <span className="next-stage-date-icon"><CalendarDays size={17} /></span>
          <div>
            <small>{tr(`已准备完成 ${currentStageName}`, `Ready to complete ${currentLabel}`)}</small>
            <h2>{tr(`设置 ${nextStageName} 的截止日期`, `Set a due date for ${nextLabel}`)}</h2>
          </div>
          <button className="icon-button" onClick={onCancel} aria-label={tr("关闭", "Close")}>
            <X size={17} />
          </button>
        </header>
        <label>
          <span>{tr("截止日期", "Due Date")}</span>
          <input
            type="date"
            required
            autoFocus
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        <p>{tr(`确认后，${nextStageName} 将成为当前阶段并加入截止日期日历。`, `After confirmation, ${nextLabel} becomes the current stage and is added to the deadline calendar.`)}</p>
        <footer>
          <button className="secondary-button" onClick={onCancel}>{tr("取消", "Cancel")}</button>
          <button
            className="primary-button"
            disabled={!dueDate}
            onClick={() => onConfirm(dueDate)}
          >
            {tr(`确认并进入 ${nextStageName}`, `Confirm and Start ${nextLabel}`)}
          </button>
        </footer>
      </section>
    </div>
  );
}
