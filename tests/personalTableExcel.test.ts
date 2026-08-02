import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildPersonalTableExcel } from "@/lib/export/personalTableExcel";

describe("个人生活表格 Excel 导出", () => {
  it("导出动态列数、列宽并保留全部行和文字", async () => {
    const data = Array.from({ length: 31 }, (_, row) =>
      Array.from({ length: 6 }, (_, column) =>
        row === 0 && column === 0 ? "测试内容" : ""
      )
    );
    const widths = [90, 110, 130, 150, 170, 190];
    const bytes = await buildPersonalTableExcel(data, widths);
    const workbook = XLSX.read(bytes, { type: "array", cellStyles: true });
    const worksheet = workbook.Sheets["个人生活表格"];
    const values = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      blankrows: true,
      defval: "",
    });

    expect(values[0]).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(values[1][0]).toBe("测试内容");
    expect(worksheet["!ref"]).toBe("A1:F32");
    expect(worksheet["!cols"]?.map((column) => column.wpx)).toEqual(widths);
  });
});
