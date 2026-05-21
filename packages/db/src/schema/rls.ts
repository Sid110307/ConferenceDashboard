import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const TENANT_TABLES = [
	"conferences",
	"user_conference_roles",
	"invitations",
	"audit_log",
	"committees",
	"staff",
	"committee_assignments",
	"attendees",
	"vehicles",
	"travel_segments",
	"accommodation_blocks",
	"accommodation_rooms",
	"room_allocations",
	"accommodation_issues",
	"food_plans",
	"meal_scans",
	"venues",
	"tracks",
	"speakers",
	"messaging_providers",
	"message_templates",
	"message_campaigns",
	"message_recipients",
	"import_jobs",
	"import_rows",
	"custom_field_definitions",
	"report_jobs",
	"helpdesk_issues",
	"vip_guests",
	"vip_checklist",
	"finance_items",
	"sponsors",
	"logistics_items",
	"certificates",
	"announcements",
	"app_settings",
	"theme_settings",
	"feedback",
	"daily_control_logs",
	"files",
	"conference_sessions",
	"session_speakers",
];

const CONFERENCE_ID_COLUMN_OVERRIDES: Record<string, string> = {
	import_rows: "(SELECT conference_id FROM import_jobs WHERE id = import_rows.job_id)",
	session_speakers:
		"(SELECT conference_id FROM conference_sessions WHERE id = session_speakers.session_id)",
};

export async function applyRowLevelSecurity(db: NodePgDatabase<any>) {
	await db.execute(sql`
		DO $$
		BEGIN
			IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'conf_app') THEN
				CREATE ROLE conf_app NOLOGIN;
			END IF;
			IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'conf_superuser') THEN
				CREATE ROLE conf_superuser NOLOGIN BYPASSRLS;
			END IF;
		END
		$$;
	`);

	for (const table of TENANT_TABLES) {
		const confExpr =
			CONFERENCE_ID_COLUMN_OVERRIDES[table] ??
			(table === "conferences" ? "id" : "conference_id");

		await db.execute(
			sql.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`),
		);
		await db.execute(
			sql.raw(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`),
		);
		await db.execute(
			sql.raw(`DROP POLICY IF EXISTS "${table}_tenant_isolation" ON "${table}";`),
		);
		await db.execute(
			sql.raw(`
				CREATE POLICY "${table}_tenant_isolation"
					ON "${table}"
					USING (
						current_setting('app.current_conference_id', true) IS NOT NULL
						AND current_setting('app.current_conference_id', true) <> ''
						AND ${confExpr}::text = current_setting('app.current_conference_id', true)
					)
					WITH CHECK (
						current_setting('app.current_conference_id', true) IS NOT NULL
						AND current_setting('app.current_conference_id', true) <> ''
						AND ${confExpr}::text = current_setting('app.current_conference_id', true)
					);
			`),
		);
	}

	await db.execute(sql`
		CREATE OR REPLACE FUNCTION set_active_conference(p_conference_id uuid)
			RETURNS void
			LANGUAGE sql
		AS $$
			SELECT set_config('app.current_conference_id', p_conference_id::text, true);
		$$;
	`);

	await db.execute(sql`
		CREATE OR REPLACE FUNCTION clear_active_conference()
			RETURNS void
			LANGUAGE sql
		AS $$
			SELECT set_config('app.current_conference_id', '', true);
		$$;
	`);
}
