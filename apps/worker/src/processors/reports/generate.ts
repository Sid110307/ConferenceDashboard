import { env } from "@/lib/env";
import { logger, putObject, storageKey } from "@/lib/infra";
import { notifyConference } from "@/lib/notify";
import { db, withTenant } from "@/lib/tenancy";
import { files as filesTable, reportJobs } from "@conference/db";
import { createId } from "@paralleldrive/cuid2";
import { eq, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts } from "pdf-lib";

type ReportType =
	| "attendees_full"
	| "travel_manifest"
	| "accommodation_roster"
	| "food_meal_counts"
	| "helpdesk_log"
	| "finance_summary";

type Format = "csv" | "xlsx" | "pdf";

const QUERIES: Record<ReportType, string> = {
	attendees_full: `
		SELECT attendee_code, name, email, phone, gender, category,
		       institution, designation, prantha, city, state,
		       registration_status, checkin_status, checked_in_at,
		       is_vip, dietary_preference, blood_group, tags
		FROM attendees
		WHERE conference_id = $1 AND deleted_at IS NULL
		ORDER BY attendee_code
	`,
	travel_manifest: `
		SELECT a.attendee_code, a.name, a.gender, a.phone,
		       t.direction, t.travel_mode, t.carrier, t.service_number,
		       t.origin_city, t.destination_city, t.scheduled_time,
		       t.pickup_status, v.label AS vehicle, v.driver_name, v.driver_phone
		FROM travel_segments t
		JOIN attendees a ON a.id = t.attendee_id
		LEFT JOIN vehicles v ON v.id = t.vehicle_id
		WHERE t.conference_id = $1 AND t.deleted_at IS NULL
		ORDER BY t.scheduled_time NULLS LAST, t.direction
	`,
	accommodation_roster: `
		SELECT b.name AS block, r.room_number, r.floor, r.capacity, r.status,
		       a.name AS attendee, a.attendee_code, a.gender,
		       al.allocated_at, al.checked_in_at, al.checked_out_at, al.status AS alloc_status
		FROM accommodation_allocations al
		JOIN accommodation_rooms r ON r.id = al.room_id
		JOIN accommodation_blocks b ON b.id = r.block_id
		JOIN attendees a ON a.id = al.attendee_id
		WHERE al.conference_id = $1 AND al.deleted_at IS NULL
		ORDER BY b.name, r.room_number
	`,
	food_meal_counts: `
		SELECT meal_date, meal_type,
		       COUNT(*)::int AS scan_count,
		       COUNT(DISTINCT attendee_id)::int AS unique_attendees
		FROM meal_scans
		WHERE conference_id = $1
		GROUP BY meal_date, meal_type
		ORDER BY meal_date, meal_type
	`,
	helpdesk_log: `
		SELECT h.issue_code, h.title, h.category, h.priority, h.status,
		       h.created_at, h.resolved_at,
		       a.name AS reported_by_attendee, s.name AS assigned_to_staff,
		       c.name AS committee, h.description, h.resolution_notes
		FROM helpdesk_issues h
		LEFT JOIN attendees a ON a.id = h.attendee_id
		LEFT JOIN staff s ON s.id = h.assigned_to_staff_id
		LEFT JOIN committees c ON c.id = h.assigned_committee_id
		WHERE h.conference_id = $1 AND h.deleted_at IS NULL
		ORDER BY h.created_at DESC
	`,
	finance_summary: `
		SELECT category,
		       direction,
		       SUM(amount_actual)::numeric(14,2) AS actual,
		       SUM(amount_planned)::numeric(14,2) AS planned,
		       COUNT(*)::int AS line_items
		FROM finance_items
		WHERE conference_id = $1 AND deleted_at IS NULL
		GROUP BY category, direction
		ORDER BY direction, category
	`,
};

export async function processReportGenerate(payload: {
	jobId: string;
	conferenceId: string;
	userId: string;
}) {
	const { jobId, conferenceId, userId } = payload;

	const [job] = await db.select().from(reportJobs).where(eq(reportJobs.id, jobId)).limit(1);
	if (!job) throw new Error(`report job ${jobId} not found`);

	const reportType = job.reportType as ReportType;
	const format = (job.format ?? "xlsx") as Format;
	const query = QUERIES[reportType];
	if (!query) {
		await db
			.update(reportJobs)
			.set({
				status: "failed",
				errorMessage: `unsupported report type: ${reportType}`,
				updatedAt: new Date(),
			})
			.where(eq(reportJobs.id, jobId));
		throw new Error(`unsupported report type: ${reportType}`);
	}

	await db
		.update(reportJobs)
		.set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
		.where(eq(reportJobs.id, jobId));

	try {
		let columns: string[] = [];
		let rows: Record<string, any>[] = [];
		await withTenant(conferenceId, async tx => {
			const result: any = await tx.execute(sql.raw(query.replace("$1", `'${conferenceId}'`)));
			rows = result.rows ?? result ?? [];
			if (rows.length > 0) columns = Object.keys(rows[0]!);
		});

		let body: Buffer;
		let contentType: string;
		let ext: string;
		if (format === "csv") {
			body = Buffer.from(renderCSV(columns, rows), "utf8");
			contentType = "text/csv";
			ext = "csv";
		} else if (format === "xlsx") {
			body = await renderXLSX(reportType, columns, rows);
			contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			ext = "xlsx";
		} else if (format === "pdf") {
			body = await renderPDF(reportType, columns, rows);
			contentType = "application/pdf";
			ext = "pdf";
		} else {
			throw new Error(`unsupported format: ${format}`);
		}

		const filename = `${reportType}-${new Date().toISOString().slice(0, 10)}.${ext}`;
		const fileId = createId();
		const key = storageKey({
			conferenceId,
			purpose: "reports",
			fileId,
			filename,
		});
		await putObject({ key, body, contentType });

		await withTenant(conferenceId, async tx => {
			const [file] = await tx
				.insert(filesTable)
				.values({
					id: fileId,
					conferenceId,
					filename,
					mimeType: contentType,
					sizeBytes: body.byteLength,
					storageKey: key,
					storageBucket: env.S3_BUCKET,
					purpose: "report" as const,
					uploadStatus: "ready" as const,
					uploadedByUserId: userId,
				})
				.returning({ id: filesTable.id });

			await tx
				.update(reportJobs)
				.set({
					status: "completed",
					fileId: file!.id,
					rowCount: rows.length,
					completedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(reportJobs.id, jobId));

			await notifyConference(tx, conferenceId, {
				type: "report.completed",
				entity: "report_job",
				id: jobId,
				meta: { rowCount: rows.length, format },
			});
		});

		logger.info({ jobId, rows: rows.length, format }, "report generated");
		return { rowCount: rows.length };
	} catch (err: any) {
		logger.error({ jobId, err: String(err) }, "report generation failed");
		await db
			.update(reportJobs)
			.set({
				status: "failed",
				errorMessage: String(err?.message ?? err).slice(0, 1000),
				updatedAt: new Date(),
			})
			.where(eq(reportJobs.id, jobId));
		throw err;
	}
}

function csvEscape(v: unknown): string {
	if (v == null) return "";
	const s = v instanceof Date ? v.toISOString() : String(v);
	if (/[",\n\r]/.test(s)) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
}

function renderCSV(columns: string[], rows: Record<string, any>[]): string {
	const lines: string[] = [columns.join(",")];
	for (const r of rows) {
		lines.push(columns.map(c => csvEscape(r[c])).join(","));
	}
	return lines.join("\n");
}

async function renderXLSX(
	sheetName: string,
	columns: string[],
	rows: Record<string, any>[],
): Promise<Buffer> {
	const wb = new ExcelJS.Workbook();
	wb.creator = "ConferenceDashboard";
	wb.created = new Date();

	const ws = wb.addWorksheet(sheetName.slice(0, 31));
	ws.columns = columns.map(c => ({
		header: c.replace(/_/g, " ").toUpperCase(),
		key: c,
		width: Math.min(Math.max(c.length + 2, 12), 40),
	}));

	ws.getRow(1).font = { bold: true };
	ws.getRow(1).alignment = { vertical: "middle", horizontal: "left" };
	for (const r of rows) {
		const row: Record<string, any> = {};
		for (const c of columns) {
			const v = r[c];
			row[c] = v instanceof Date ? v.toISOString() : v;
		}
		ws.addRow(row);
	}

	ws.views = [{ state: "frozen", ySplit: 1 }];
	const arr = await wb.xlsx.writeBuffer();
	return Buffer.from(arr as ArrayBuffer);
}

async function renderPDF(
	title: string,
	columns: string[],
	rows: Record<string, any>[],
): Promise<Buffer> {
	const pdf = await PDFDocument.create();
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

	const pageWidth = 842;
	const pageHeight = 595;
	const margin = 28;
	const lineHeight = 14;
	const headerFontSize = 9;
	const bodyFontSize = 8;

	let page = pdf.addPage([pageWidth, pageHeight]);
	let y = pageHeight - margin;

	page.drawText(title.replace(/_/g, " ").toUpperCase(), {
		x: margin,
		y,
		size: 14,
		font: fontBold,
	});
	y -= 24;
	page.drawText(`Generated: ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, {
		x: margin,
		y,
		size: 8,
		font,
	});
	y -= 16;

	const usable = pageWidth - margin * 2;
	const totalLen = columns.reduce((s, c) => s + Math.max(c.length, 4), 0);
	const widths = columns.map(c => Math.floor((usable * Math.max(c.length, 4)) / totalLen));

	const drawHeader = () => {
		let x = margin;
		for (let i = 0; i < columns.length; i++) {
			page.drawText(columns[i]!.toUpperCase(), {
				x,
				y,
				size: headerFontSize,
				font: fontBold,
			});
			x += widths[i]!;
		}
		y -= lineHeight;
	};
	drawHeader();

	for (const r of rows) {
		if (y < margin + lineHeight) {
			page = pdf.addPage([pageWidth, pageHeight]);
			y = pageHeight - margin;
			drawHeader();
		}

		let x = margin;
		for (let i = 0; i < columns.length; i++) {
			const v = r[columns[i]!];
			const text =
				v == null
					? ""
					: v instanceof Date
						? v.toISOString().slice(0, 16).replace("T", " ")
						: String(v);
			const maxChars = Math.floor(widths[i]! / 4.5);
			page.drawText(text.slice(0, maxChars), {
				x,
				y,
				size: bodyFontSize,
				font,
			});
			x += widths[i]!;
		}
		y -= lineHeight;
	}

	const bytes = await pdf.save();
	return Buffer.from(bytes);
}
