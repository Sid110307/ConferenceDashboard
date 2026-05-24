import type { ParsedTable } from "@/processors/imports/parsers/csv";
import ExcelJS from "exceljs";

export async function parseXLSX(buf: Buffer): Promise<ParsedTable> {
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.load(buf.buffer as ArrayBuffer);
	const ws = wb.worksheets[0];
	if (!ws) throw new Error("no worksheets found");

	const headerRow = ws.getRow(1);
	const headers: string[] = [];
	headerRow.eachCell({ includeEmpty: false }, cell => {
		headers.push(String(cell.value ?? "").trim());
	});

	const rows: Record<string, string>[] = [];
	ws.eachRow({ includeEmpty: false }, (row, idx) => {
		if (idx === 1) return;
		const out: Record<string, string> = {};
		for (let i = 0; i < headers.length; ++i) {
			const cell = row.getCell(i + 1);
			let v: any = cell.value;
			if (v && typeof v === "object") {
				if ("text" in v) v = v.text;
				else if ("result" in v) v = v.result;
				else if (v instanceof Date) v = v.toISOString();
				else v = JSON.stringify(v);
			}
			out[headers[i]!] = String(v ?? "").trim();
		}
		if (Object.values(out).some(x => x.length > 0)) rows.push(out);
	});

	return { headers, rows };
}
