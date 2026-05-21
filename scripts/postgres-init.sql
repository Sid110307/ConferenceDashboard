-- Bootstrap extensions for local Postgres.
-- Neon: enable via the dashboard (uuid-ossp, pgcrypto, citext are available).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive emails
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- fuzzy search on names
CREATE EXTENSION IF NOT EXISTS "btree_gin";   -- composite indexes on jsonb + scalars

-- App-level GUC for tenancy enforcement at the DB level.
-- The API sets this per transaction; RLS policies read it.
-- (No-op here; set on connection by drizzle via SET LOCAL.)
