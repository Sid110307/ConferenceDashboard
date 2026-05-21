# Drops and recreates the public schema. Use in dev only.

$ErrorActionPreference = "Stop"
if (-not $env:DATABASE_URL) {
  $envPath = Join-Path $PSScriptRoot "..\.env"

  if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
      $line = $_.Trim()
      if (-not $line -or $line.StartsWith("#")) {
        return
      }

      if ($line -match "^\s*([^=]+)\s*=\s*(.*)\s*$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()

        if (
          ($value.StartsWith('"') -and $value.EndsWith('"')) -or
          ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
          $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
      }
    }
  }
}

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL not set. Aborting."
  exit 1
}

if ($env:DATABASE_URL -like "*neon.tech*" -and $env:ALLOW_NEON_RESET -ne "yes") {
  Write-Error "Refusing to reset a Neon database without ALLOW_NEON_RESET=yes"
  exit 1
}

Write-Host "==> Dropping and recreating schema 'public'..."

@"
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
"@ | psql $env:DATABASE_URL

Write-Host "==> Reapplying extensions..."

@"
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
"@ | psql $env:DATABASE_URL

Write-Host "==> Done. Run ``pnpm db:migrate`` next."
