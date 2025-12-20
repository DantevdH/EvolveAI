# Supabase Local Development Setup

Quick guide for running Supabase locally with Docker (bypasses corporate VPN).

## Prerequisites

- Docker Desktop running
- Supabase CLI: `brew install supabase/tap/supabase`

## Quick Start

```bash
# Start Supabase
supabase start

# Get credentials
supabase status

# Stop Supabase
supabase stop
```

## Local Credentials (Automatic)

The `start.sh` script automatically extracts credentials from `supabase status` and exports them as environment variables. **No manual `.env` updates needed!**

Your `.env` file should contain **ONLY production/remote credentials**:

```env
# .env - Production/Remote values only
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<production-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
SUPABASE_JWT_SECRET=<production-jwt-secret>

# Frontend (.env)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-key>
# NO local URLs (http://127.0.0.1:54321) here!
```

**How it works:**
- `start.sh` automatically runs `supabase status` and extracts credentials
- Credentials are exported as environment variables (session-only, doesn't modify `.env`)
- Backend auto-detects local Supabase and uses these credentials
- Frontend reads from environment variables set by Expo

**Note:** Keys change on restart, but `start.sh` handles this automatically.

## Access Points

- **Studio:** http://127.0.0.1:54323
- **Database:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **API:** http://127.0.0.1:54321

## Test Users

Local Supabase is automatically seeded with test users when you run `supabase db reset` or `supabase start`:

- **Email:** dev@test.com
- **Password:** testpass123

Use these credentials to login during local development. Social login (OAuth) buttons are automatically hidden in local dev mode.

## Sync Schema from Production (VPN Workaround)

Since `supabase db pull` is blocked by VPN, use the dashboard:

### Step 1: Download Schema

1. Go to Supabase Dashboard → Database → Schema Visualizer → **Download Schema**
2. This downloads a SQL file with all table definitions

### Step 2: Create Migration

```bash
supabase migration new initial_schema_from_production
```

### Step 3: Fix Common Issues

Copy downloaded schema into migration file, then fix:

- ✅ Add `IF NOT EXISTS` to all `CREATE TABLE` statements
- ✅ Replace `ARRAY` → `text[]` (or `numeric[]`, `integer[]` as needed)
- ✅ Replace `USER-DEFINED` → `vector` (for embeddings)
- ✅ Replace `integer NOT NULL DEFAULT nextval('seq'::regclass)` → `SERIAL` (or `BIGSERIAL` for bigint)
- ✅ Add `CREATE EXTENSION IF NOT EXISTS vector;` at the top (if using vector type)
- ✅ Reorder tables: base tables first, then tables with foreign keys

### Step 4: Apply Migration

```bash
supabase db reset
```

## Environment Variables

### Local Development

**Important:** Your `.env` file should **NOT** contain local Supabase URLs. The `start.sh` script handles local credentials automatically.

Use `.env` file (gitignored) for **production/remote values only**:
```env
# Production Supabase (for reference/deployment)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=<production-key>
# ... other production vars

# Local dev credentials are auto-extracted by start.sh
# No need to add http://127.0.0.1:54321 here!
```

### Production (Render)

- **Never use `.env` files** - code auto-detects production and skips file loading
- Set all variables via Render UI (Environment tab)
- Code detects `RENDER` env var and uses system variables only

### Optional: `.env.production`

Create `.env.production` (gitignored) as **reference only** - documents what to set in Render UI. **NOT loaded by application.**

## Common Commands

```bash
# Start/stop
supabase start
supabase stop
supabase status

# Schema sync
supabase db reset          # Apply all migrations
supabase db diff -f name   # Create migration from local changes
supabase db push           # Push migrations to remote (when VPN allows)

# Create migration manually
supabase migration new migration_name
```

## Troubleshooting

**Port conflict:** Stop services on ports 54321-54327 or change in `supabase/config.toml`

**Keys changed:** `start.sh` automatically extracts new keys on every run - no manual action needed

**Backend won't start:** Check that Supabase is running (`supabase status`). Backend will start in degraded mode with warnings if Supabase is unavailable.

**Social login not working locally:** This is expected - OAuth buttons are hidden in local dev. Use email/password login with test user (dev@test.com / testpass123).

**Edge Runtime error:** Already disabled in config (VPN SSL issue)

**Schema sync blocked:** Use dashboard download method (see above)
