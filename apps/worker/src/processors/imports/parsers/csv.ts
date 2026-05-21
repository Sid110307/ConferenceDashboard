import Papa from "papaparse";

export type ParsedTable = {
	headers: string[];
	rows: Record<string, string>[];
};

export function parseCSV(buf: Buffer): ParsedTable {
	const text = buf.toString("utf8").replace(/^\uFEFF/, "");
	const result = Papa.parse<Record<string, string>>(text, {
		header: true,
		skipEmptyLines: true,
		dynamicTyping: false,
		transformHeader: h => h.trim(),
	});
	if (result.errors.length) {
		const first = result.errors[0]!;
		throw new Error(`CSV parse error at row ${first.row}: ${first.message}`);
	}

	const headers = (result.meta.fields ?? []).map(h => h.trim());
	const rows = (result.data ?? []).map(r => {
		const out: Record<string, string> = {};
		for (const h of headers) {
			out[h] = String(r[h] ?? "").trim();
		}
		return out;
	});
	return { headers, rows };
}
