"use client";

import {
  Check,
  Columns3,
  Download,
  Eraser,
  Minus,
  Plus,
  RotateCcw,
  Rows3,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { downloadPersonalTableExcel } from "@/lib/export/personalTableExcel";

const COLUMN_COUNT = 5;
const INITIAL_ROW_COUNT = 30;
const DEFAULT_COLUMN_WIDTH = 130;
const MIN_COLUMN_WIDTH = 80;
const MAX_COLUMN_WIDTH = 360;
const MAX_UNDO_STATES = 100;

interface TableSnapshot {
  data: string[][];
  columnWidths: number[];
}

export function spreadsheetColumnLabel(index: number) {
  let label = "";
  let cursor = index + 1;
  while (cursor > 0) {
    const remainder = (cursor - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    cursor = Math.floor((cursor - 1) / 26);
  }
  return label;
}

export function createEmptyPersonalTable(rowCount = INITIAL_ROW_COUNT) {
  return Array.from({ length: rowCount }, () =>
    Array.from({ length: COLUMN_COUNT }, () => "")
  );
}

export function createDefaultColumnWidths(columnCount = COLUMN_COUNT) {
  return Array.from({ length: columnCount }, () => DEFAULT_COLUMN_WIDTH);
}

export function PersonalTableDialog({
  title,
  data,
  columnWidths,
  onChange,
  onColumnWidthsChange,
  onSave,
  onClose,
}: {
  title: string;
  data: string[][];
  columnWidths: number[];
  onChange: (data: string[][]) => void;
  onColumnWidthsChange: (widths: number[]) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { tr } = useLanguage();
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [cellEditingChanged, setCellEditingChanged] = useState(false);
  const undoHistoryRef = useRef<TableSnapshot[]>([]);
  const cellEditSnapshotRef = useRef<TableSnapshot | null>(null);
  const [activeCell, setActiveCell] = useState<{
    row: number;
    column: number;
  } | null>(null);
  const columnCount = data[0]?.length ?? columnWidths.length;
  const labels = Array.from({ length: columnCount }, (_, index) =>
    spreadsheetColumnLabel(index)
  );
  const widths = Array.from(
    { length: columnCount },
    (_, index) => columnWidths[index] ?? DEFAULT_COLUMN_WIDTH,
  );

  function createSnapshot(): TableSnapshot {
    return {
      data: data.map((row) => [...row]),
      columnWidths: [...widths],
    };
  }

  function snapshotsEqual(left: TableSnapshot, right: TableSnapshot) {
    return left.columnWidths.length === right.columnWidths.length
      && left.columnWidths.every((width, index) => width === right.columnWidths[index])
      && left.data.length === right.data.length
      && left.data.every((row, rowIndex) =>
        row.length === right.data[rowIndex].length
        && row.every((cell, columnIndex) =>
          cell === right.data[rowIndex][columnIndex]
        )
      );
  }

  function pushUndoState(snapshot = createSnapshot()) {
    const history = undoHistoryRef.current;
    const last = history.at(-1);
    if (last && snapshotsEqual(last, snapshot)) return;
    undoHistoryRef.current = [...history, snapshot].slice(-MAX_UNDO_STATES);
    setUndoCount(undoHistoryRef.current.length);
  }

  function applyData(nextData: string[][]) {
    setSaved(false);
    onChange(nextData);
  }

  function applyColumnWidths(nextWidths: number[]) {
    setSaved(false);
    onColumnWidthsChange(nextWidths);
  }

  function finishCellEdit() {
    const snapshot = cellEditSnapshotRef.current;
    if (snapshot && !snapshotsEqual(snapshot, createSnapshot())) {
      pushUndoState(snapshot);
    }
    cellEditSnapshotRef.current = null;
    setCellEditingChanged(false);
  }

  function undoTableChange() {
    const pendingCellEdit = cellEditSnapshotRef.current;
    if (pendingCellEdit && !snapshotsEqual(pendingCellEdit, createSnapshot())) {
      cellEditSnapshotRef.current = null;
      setCellEditingChanged(false);
      applyData(pendingCellEdit.data.map((row) => [...row]));
      applyColumnWidths([...pendingCellEdit.columnWidths]);
      return;
    }

    const previous = undoHistoryRef.current.pop();
    if (!previous) return;
    setUndoCount(undoHistoryRef.current.length);
    applyData(previous.data.map((row) => [...row]));
    applyColumnWidths([...previous.columnWidths]);
  }

  function updateCell(rowIndex: number, columnIndex: number, value: string) {
    setCellEditingChanged(true);
    applyData(data.map((row, currentRow) =>
      currentRow === rowIndex
        ? row.map((cell, currentColumn) =>
            currentColumn === columnIndex ? value : cell
          )
        : row
    ));
  }

  function addRow() {
    pushUndoState();
    applyData([...data, Array.from({ length: columnCount }, () => "")]);
    setActiveCell({ row: data.length, column: activeCell?.column ?? 0 });
  }

  function deleteRow() {
    if (data.length <= 1) return;
    pushUndoState();
    const rowIndex = Math.min(activeCell?.row ?? data.length - 1, data.length - 1);
    applyData(data.filter((_, index) => index !== rowIndex));
    setActiveCell((current) => ({
      row: Math.max(0, Math.min(rowIndex, data.length - 2)),
      column: current?.column ?? 0,
    }));
  }

  function addColumn() {
    pushUndoState();
    applyData(data.map((row) => [...row, ""]));
    applyColumnWidths([...widths, DEFAULT_COLUMN_WIDTH]);
    setActiveCell({ row: activeCell?.row ?? 0, column: columnCount });
  }

  function deleteColumn() {
    if (columnCount <= 1) return;
    pushUndoState();
    const columnIndex = Math.min(
      activeCell?.column ?? columnCount - 1,
      columnCount - 1,
    );
    applyData(data.map((row) => row.filter((_, index) => index !== columnIndex)));
    applyColumnWidths(widths.filter((_, index) => index !== columnIndex));
    setActiveCell((current) => ({
      row: current?.row ?? 0,
      column: Math.max(0, Math.min(columnIndex, columnCount - 2)),
    }));
  }

  function clearTable() {
    pushUndoState();
    applyData(data.map((row) => row.map(() => "")));
  }

  function startColumnResize(
    columnIndex: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    finishCellEdit();
    pushUndoState();
    const startX = event.clientX;
    const startWidth = widths[columnIndex];
    const move = (moveEvent: PointerEvent) => {
      const nextWidth = Math.min(
        MAX_COLUMN_WIDTH,
        Math.max(MIN_COLUMN_WIDTH, startWidth + moveEvent.clientX - startX),
      );
      applyColumnWidths(
        widths.map((width, index) => index === columnIndex ? nextWidth : width),
      );
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      document.body.classList.remove("resizing-table-column");
    };
    document.body.classList.add("resizing-table-column");
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  async function exportExcel() {
    setExporting(true);
    try {
      await downloadPersonalTableExcel(title, data, widths);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="personal-table-layer">
      <button
        className="personal-table-backdrop"
        onClick={onClose}
        aria-label={tr("关闭表格", "Close table")}
      />
      <section
        className="personal-table-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-table-title"
      >
        <header>
          <div>
            <small>{tr("个人生活任务", "Personal task")}</small>
            <h2 id="personal-table-title">{tr("任务表格", "Task Table")}</h2>
          </div>
          <div className="personal-table-header-actions">
            <button className="table-header-action" onClick={clearTable}>
              <Eraser size={14} /> {tr("一键清空", "Clear All")}
            </button>
            <button
              className="table-header-action"
              disabled={undoCount === 0 && !cellEditingChanged}
              onClick={undoTableChange}
            >
              <RotateCcw size={14} /> {tr("撤销", "Undo")}
            </button>
            <button
              className="table-header-action"
              disabled={exporting}
              onClick={() => void exportExcel()}
            >
              <Download size={14} />
              {exporting ? tr("正在导出…", "Exporting…") : tr("导出表格", "Export Table")}
            </button>
            <button className="icon-button" onClick={onClose} aria-label={tr("关闭", "Close")}>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="personal-table-scroll">
          <table style={{ width: Math.max(690, 42 + widths.reduce((sum, width) => sum + width, 0)) }}>
            <colgroup>
              <col style={{ width: 42 }} />
              {widths.map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th aria-label={tr("行号", "Row number")} />
                {labels.map((label, index) => (
                  <th className="personal-table-column-header" key={label}>
                    {label}
                    <button
                      className="personal-table-resize-handle"
                      type="button"
                      aria-label={tr(`调整 ${label} 列宽`, `Resize column ${label}`)}
                      onPointerDown={(event) => startColumnResize(index, event)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <th>{rowIndex + 1}</th>
                  {row.map((cell, columnIndex) => (
                    <td key={columnIndex}>
                      <input
                        type="text"
                        value={cell}
                        aria-label={`${rowIndex + 1}${labels[columnIndex]}`}
                        onFocus={() => {
                          setActiveCell({ row: rowIndex, column: columnIndex });
                          cellEditSnapshotRef.current = createSnapshot();
                          setCellEditingChanged(false);
                        }}
                        onBlur={finishCellEdit}
                        onChange={(event) =>
                          updateCell(rowIndex, columnIndex, event.target.value)
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer>
          <div className="personal-table-edit-actions">
            <button className="secondary-button" onClick={addRow}>
              <Plus size={14} /> {tr("添加行", "Add Row")}
            </button>
            <button
              className="secondary-button"
              disabled={data.length <= 1}
              onClick={deleteRow}
              title={tr("删除当前行；未选择时删除最后一行", "Delete the current row; deletes the last row when none is selected")}
            >
              <Rows3 size={14} /> <Minus size={11} /> {tr("删除行", "Delete Row")}
            </button>
            <button className="secondary-button" onClick={addColumn}>
              <Plus size={14} /> <Columns3 size={14} /> {tr("添加列", "Add Column")}
            </button>
            <button
              className="secondary-button"
              disabled={columnCount <= 1}
              onClick={deleteColumn}
              title={tr("删除当前列；未选择时删除最后一列", "Delete the current column; deletes the last column when none is selected")}
            >
              <Columns3 size={14} /> <Minus size={11} /> {tr("删除列", "Delete Column")}
            </button>
          </div>
          <div className="personal-table-export-actions">
            <span>{tr(`${data.length} 行 · ${columnCount} 列`, `${data.length} rows · ${columnCount} columns`)}</span>
            <button
              className="primary-button personal-table-save-button"
              onClick={() => {
                onSave();
                setSaved(true);
              }}
            >
              <Check size={14} />
              {saved ? tr("已保存", "Saved") : tr("保存表格", "Save Table")}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
