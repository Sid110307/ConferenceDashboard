import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

export async function applyDatabaseFunctions(db: NodePgDatabase<any>) {
	await db.execute(sql`
		CREATE OR REPLACE FUNCTION file_is_unreferenced(target_file_id uuid)
		RETURNS boolean
		LANGUAGE plpgsql
		AS $$
		DECLARE
			r record;
			found_ref boolean;
		BEGIN
			FOR r IN
				SELECT
					conrelid::regclass AS referencing_table,
					a.attname AS referencing_column
				FROM pg_constraint c
				JOIN unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
				JOIN pg_attribute a
					ON a.attrelid = c.conrelid
					AND a.attnum = ck.attnum
				WHERE c.contype = 'f'
					AND c.confrelid = 'files'::regclass
			LOOP
				EXECUTE format(
					'SELECT EXISTS (SELECT 1 FROM %s WHERE %I = $1)',
					r.referencing_table,
					r.referencing_column
				)
				INTO found_ref
				USING target_file_id;

				IF found_ref THEN
					RETURN false;
				END IF;
			END LOOP;

			RETURN true;
		END;
		$$;
	`);
}
