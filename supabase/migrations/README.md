# Supabase Migrations

This directory contains the database schema migrations for Nowly v2.

## Baseline Schema

The migrations in this directory represent the **baseline schema** that was initially set up via the Supabase SQL Editor. These files serve as:

1. **Version control** - Track the database schema in git
2. **Documentation** - Clear reference for the complete schema
3. **New environments** - Set up development/staging environments or onboard new team members
4. **Reproducibility** - Recreate the exact database structure in a fresh Supabase project

## Migration Files

| File                                        | Description                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `20240101000001_create_profiles.sql`        | UUID extension, profiles table, auto-creation trigger, and `update_updated_at()` function |
| `20240101000002_create_workspaces.sql`      | Workspaces table with indexes and RLS                                                     |
| `20240101000003_create_categories.sql`      | Categories table with indexes and RLS                                                     |
| `20240101000004_create_recurring_tasks.sql` | Recurring tasks master templates with recurrence configuration                            |
| `20240101000005_create_tasks.sql`           | Main tasks table with self-reference for subtasks                                         |
| `20240101000006_create_triggers.sql`        | Recurring task generation trigger                                                         |

## Important Notes

### ⚠️ Do NOT Re-run on Existing Database

These migrations have **already been applied** to the current Supabase project. Running them again is unnecessary and may cause errors (though they are written to be idempotent with `IF NOT EXISTS` / `DROP IF EXISTS`).

### Using These Migrations

**For new Supabase projects:**

```bash
# Run migrations in order
psql -h your-db-host -U postgres -d postgres -f 20240101000001_create_profiles.sql
psql -h your-db-host -U postgres -d postgres -f 20240101000002_create_workspaces.sql
# ... etc
```

Or use the Supabase CLI (if configured):

```bash
supabase db push
```

**For local development with Supabase CLI:**

```bash
supabase start
supabase db reset  # This will run all migrations
```

### Future Schema Changes

For any future database changes:

1. Create a new migration file with a timestamp: `YYYYMMDDHHMMSS_description.sql`
2. Use the same idempotent pattern (`IF NOT EXISTS`, `DROP IF EXISTS`)
3. Include rollback instructions in comments
4. Test in development before applying to production
5. Run the migration in Supabase SQL Editor or via CLI

### Key Schema Concepts

- **Scheduled vs Due Dates**: `scheduled_date` is when you plan to work on a task, `due_date` is the hard deadline
- **Recurring Tasks**: Master templates in `recurring_tasks` generate instances in `tasks`
- **RLS Performance**: All policies wrap `auth.uid()` in `SELECT` for better performance
- **Triggers**: Auto-update timestamps and generate recurring task instances on completion

## Schema Documentation

For detailed information about the database schema, see:

- `/docs/DATABASE.md` - Complete schema specification and guidelines
- `/docs/ARCHITECTURE.md` - Architectural decisions and rationale
