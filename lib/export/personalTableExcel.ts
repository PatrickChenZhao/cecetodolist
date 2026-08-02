function spreadsheetColumnLabel(index: number) {
  let label = "";
  let cursor = index + 1;
  while (cursor > 0) {
    const remainder = (cursor - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    cursor = Math.floor((cursor - 1) / 26);
  }
  return label;
}

function safeWorkbookName(title: string) {
  const name = title.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 60);
  return name || "个人生活表格";
}

export async function buildPersonalTableExcel(
  data: string[][],
  columnWidths?: number[],
) {
  const XLSX = await import("xlsx");
  const columnCount = data[0]?.length ?? columnWidths?.length ?? 1;
  const columnLabels = Array.from(
    { length: columnCount },
    (_, index) => spreadsheetColumnLabel(index),
  );
  const worksheet = XLSX.utils.aoa_to_sheet([columnLabels, ...data]);
  worksheet["!cols"] = columnLabels.map((_, index) => ({
    wpx: columnWidths?.[index] ?? 130,
  }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "个人生活表格");
  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

export async function downloadPersonalTableExcel(
  title: string,
  data: string[][],
  columnWidths?: number[],
) {
  const bytes = await buildPersonalTableExcel(data, columnWidths);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeWorkbookName(title)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
