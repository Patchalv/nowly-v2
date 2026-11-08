// Moves the owner's Nowly data from Supabase into Neon under the owner's new
// Neon Auth user ID (docs/NEON_MIGRATION_SPEC.md, "Data move and cutover").
//
//   SUPABASE_DB_URL=postgresql://...   direct (non-pooled) Supabase connection
//   NEON_DATABASE_URL=postgresql://...       direct (non-pooled) Neon connection
//   OLD_USER_ID=<uuid>                 owner's Supabase auth.users id
//   NEW_USER_ID=<uuid>                 owner's neon_auth."user" id
//   node scripts/import-owner-data.mjs           # dry run (default)
//   node scripts/import-owner-data.mjs --write   # replace the data
//
// Each value can also be passed as an argument (--supabase-db-url=..., etc.),
// but prefer the environment: arguments end up in shell history.
//
// The dry run reads from both databases and writes nothing. --write runs one
// Neon transaction that:
//   1. deletes every row owned by NEW_USER_ID (the starter rows that
//      ensure_account() created, or the result of an earlier import);
//   2. inserts the exported rows with OLD_USER_ID rewritten to NEW_USER_ID,
//      keeping every row's own id, parent tasks before their subtasks;
//   3. checks that NEW_USER_ID now owns exactly the exported rows (same ids,
//      same column values, same per-table counts) and rolls back if not.
// Running --write again gives the same end state.
//
// Triggers and foreign keys stay on: Neon refuses session_replication_role.
// Every trigger fires on UPDATE only, so the inserts start no recurring
// generation. The delete order (tasks first) keeps ON DELETE SET NULL from
// updating any task, which would fire those triggers.
//
// SSL: both URLs must set sslmode (only localhost may omit it). For Neon,
// use sslmode=verify-full: pg already treats require as verify-full and
// warns about it. Supabase's certificate is signed by Supabase's own root
// CA: download it from the project's Database settings and append
// `?sslmode=verify-full&sslrootcert=/path/to/prod-ca-2021.crt` to
// SUPABASE_DB_URL. Supabase's direct host is IPv6-only without the IPv4
// add-on; on an IPv4-only network use the session pooler (port 5432).
//
// Rehearsal (cutover step 6), on a throwaway branch of the Neon default branch:
//   1. Create the branch with Neon Auth and the Data API on it.
//   2. Sign up a throwaway user and call ensure_account() for it, e.g. by
//      signing in to a preview deployment pointed at the branch, or with the
//      sign-up flow in scripts/check-neon-data-api.mjs. Read its id from
//      neon_auth."user" and use it as NEW_USER_ID.
//   3. Dry run, then --write. Check the counts in the output.
//   4. Run --write again: the output must match.
//   5. Delete the branch.
//
// Exit codes: 0 success, 1 failure (nothing committed), 2 missing or invalid
// configuration.

import pg from 'pg';

const TABLES = [
  'profiles',
  'workspaces',
  'categories',
  'recurring_tasks',
  'tasks',
  'user_onboarding',
];

// The column that holds the user id, per table. Categories have none: they
// belong to the user through their workspace.
const OWNER_COLUMN = {
  profiles: 'id',
  workspaces: 'user_id',
  categories: null,
  recurring_tasks: 'user_id',
  tasks: 'user_id',
  user_onboarding: 'user_id',
};

// Rows owned by $1, per table.
const OWNED_BY = {
  profiles: 'id = $1',
  workspaces: 'user_id = $1',
  categories:
    'workspace_id IN (SELECT id FROM public.workspaces WHERE user_id = $1)',
  recurring_tasks: 'user_id = $1',
  tasks: 'user_id = $1',
  user_onboarding: 'user_id = $1',
};

// Children before parents, so no ON DELETE SET NULL ever updates a row that
// survives the delete. Deleting workspaces cascades to their categories.
const DELETE_ORDER = [
  'tasks',
  'recurring_tasks',
  'categories',
  'workspaces',
  'user_onboarding',
  'profiles',
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class ImportError extends Error {}

function readConfig(argv) {
  const args = new Map();
  for (const arg of argv) {
    const match = /^--([a-z-]+)(?:=(.*))?$/.exec(arg);
    if (!match) throw new ImportError(`Unknown argument: ${arg}`);
    args.set(match[1], match[2] ?? true);
  }
  const value = (name) => {
    const fromArg = args.get(name.toLowerCase().replaceAll('_', '-'));
    return typeof fromArg === 'string' ? fromArg : process.env[name];
  };
  const config = {
    supabaseUrl: value('SUPABASE_DB_URL'),
    neonUrl: value('NEON_DATABASE_URL'),
    oldUserId: value('OLD_USER_ID'),
    newUserId: value('NEW_USER_ID'),
    write: args.get('write') === true,
  };
  const known = new Set([
    'supabase-db-url',
    'neon-database-url',
    'old-user-id',
    'new-user-id',
    'write',
  ]);
  for (const key of args.keys()) {
    if (!known.has(key)) throw new ImportError(`Unknown argument: --${key}`);
  }
  const missing = [
    ['SUPABASE_DB_URL', config.supabaseUrl],
    ['NEON_DATABASE_URL', config.neonUrl],
    ['OLD_USER_ID', config.oldUserId],
    ['NEW_USER_ID', config.newUserId],
  ].filter(([, v]) => !v);
  if (missing.length > 0) {
    throw new ImportError(`Set ${missing.map(([k]) => k).join(', ')}`);
  }
  for (const [name, id] of [
    ['OLD_USER_ID', config.oldUserId],
    ['NEW_USER_ID', config.newUserId],
  ]) {
    if (!UUID.test(id)) throw new ImportError(`${name} is not a UUID`);
  }
  config.oldUserId = config.oldUserId.toLowerCase();
  config.newUserId = config.newUserId.toLowerCase();
  if (config.oldUserId === config.newUserId) {
    throw new ImportError('OLD_USER_ID and NEW_USER_ID are the same');
  }
  for (const [name, url] of [
    ['SUPABASE_DB_URL', config.supabaseUrl],
    ['NEON_DATABASE_URL', config.neonUrl],
  ]) {
    requireSsl(name, url);
  }
  return config;
}

// Without sslmode, pg connects in plaintext. Only a local database may do so.
function requireSsl(name, url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ImportError(`${name} is not a connection URL`);
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  const mode = parsed.searchParams.get('sslmode');
  if (!local && (!mode || ['disable', 'allow', 'prefer'].includes(mode))) {
    throw new ImportError(`${name} must set sslmode (verify-full)`);
  }
}

// Column name -> type for the six tables. Aborts on generated or identity
// columns, which `INSERT ... SELECT *` can't write.
async function readColumns(client, label) {
  const { rows } = await client.query(
    `SELECT table_name, column_name, data_type, udt_name,
            is_generated, is_identity
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1)
      ORDER BY table_name, column_name`,
    [TABLES]
  );
  const columns = Object.fromEntries(TABLES.map((t) => [t, new Map()]));
  for (const row of rows) {
    if (row.is_generated === 'ALWAYS' || row.is_identity === 'YES') {
      throw new ImportError(
        `${label}: ${row.table_name}.${row.column_name} is generated or identity`
      );
    }
    columns[row.table_name].set(
      row.column_name,
      `${row.data_type}/${row.udt_name}`
    );
  }
  for (const table of TABLES) {
    if (columns[table].size === 0) {
      throw new ImportError(`${label}: table public.${table} not found`);
    }
  }
  return columns;
}

// Rows exported as JSON with missing keys loading as NULL, so the two schemas
// must have the same columns with the same types.
function compareColumns(source, target) {
  const problems = [];
  for (const table of TABLES) {
    const names = new Set([...source[table].keys(), ...target[table].keys()]);
    for (const name of names) {
      const a = source[table].get(name);
      const b = target[table].get(name);
      if (a !== b) {
        problems.push(
          `${table}.${name}: Supabase ${a ?? 'missing'}, Neon ${b ?? 'missing'}`
        );
      }
    }
  }
  if (problems.length > 0) {
    throw new ImportError(
      `Schemas differ:\n  ${problems.join('\n  ')}\nApply the Neon migrations before importing.`
    );
  }
}

// Every row owned by userId, per table, as parsed JSON. Postgres builds the
// JSON so dates, timestamps and arrays never pass through JS types.
async function readOwnedRows(client, userId) {
  const rows = {};
  for (const table of TABLES) {
    const { rows: result } = await client.query(
      `SELECT coalesce(json_agg(t ORDER BY t.id), '[]')::text AS rows
         FROM public.${table} t WHERE ${OWNED_BY[table]}`,
      [userId]
    );
    rows[table] = JSON.parse(result[0].rows);
  }
  return rows;
}

async function exportFromSupabase(client, oldUserId) {
  // One snapshot, so the six reads agree with each other.
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const rows = await readOwnedRows(client, oldUserId);
    await client.query('COMMIT');
    return rows;
  } catch (error) {
    await rollback(client);
    throw error;
  }
}

// ROLLBACK that never replaces the error being handled. If the connection
// is gone, Postgres has already discarded the transaction.
async function rollback(client) {
  await client.query('ROLLBACK').catch(() => {});
}

// The exported set must only reference rows inside itself; anything else
// would fail a foreign key on Neon (or point at someone else's data).
function checkSelfContained(exported) {
  if (exported.profiles.length !== 1) {
    throw new ImportError(
      `Expected 1 profile for OLD_USER_ID on Supabase, found ${exported.profiles.length}`
    );
  }
  const ids = (table) => new Set(exported[table].map((r) => r.id));
  const workspaces = ids('workspaces');
  const categories = ids('categories');
  const templates = ids('recurring_tasks');
  const tasks = ids('tasks');
  const problems = [];
  const expect = (table, row, column, set, nullable) => {
    const value = row[column];
    if (value === null && nullable) return;
    if (!set.has(value)) {
      problems.push(`${table} ${row.id}: ${column} ${value} is not exported`);
    }
  };
  for (const row of exported.recurring_tasks) {
    expect('recurring_tasks', row, 'workspace_id', workspaces, false);
    expect('recurring_tasks', row, 'category_id', categories, true);
  }
  for (const row of exported.tasks) {
    expect('tasks', row, 'workspace_id', workspaces, false);
    expect('tasks', row, 'category_id', categories, true);
    expect('tasks', row, 'recurring_task_id', templates, true);
    expect('tasks', row, 'parent_task_id', tasks, true);
  }
  if (problems.length > 0) {
    throw new ImportError(
      `Export references rows outside it:\n  ${problems.join('\n  ')}`
    );
  }
}

// Rewrites the owner column only. Nothing else in the data mentions the id.
function rewriteOwner(exported, oldUserId, newUserId) {
  const rewritten = {};
  for (const table of TABLES) {
    const column = OWNER_COLUMN[table];
    rewritten[table] = exported[table].map((row) => {
      if (!column) return row;
      if (row[column] !== oldUserId) {
        throw new ImportError(`${table} ${row.id}: unexpected ${column}`);
      }
      return { ...row, [column]: newUserId };
    });
  }
  return rewritten;
}

// Tasks split into batches where every task's parent is in an earlier batch
// (or it has none). The first batch is the tasks with no parent.
function taskBatches(tasks) {
  const batches = [];
  const loaded = new Set();
  let remaining = tasks;
  while (remaining.length > 0) {
    const batch = remaining.filter(
      (t) => t.parent_task_id === null || loaded.has(t.parent_task_id)
    );
    if (batch.length === 0) {
      throw new ImportError('Tasks have a parent_task_id cycle');
    }
    for (const t of batch) loaded.add(t.id);
    remaining = remaining.filter((t) => !loaded.has(t.id));
    batches.push(batch);
  }
  return batches;
}

async function insertRows(client, table, rows) {
  if (rows.length === 0) return 0;
  const result = await client.query(
    `INSERT INTO public.${table}
     SELECT * FROM json_populate_recordset(null::public.${table}, $1::json)`,
    [JSON.stringify(rows)]
  );
  return result.rowCount;
}

async function countOwned(client, userId) {
  const counts = {};
  for (const table of TABLES) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM public.${table} WHERE ${OWNED_BY[table]}`,
      [userId]
    );
    counts[table] = rows[0].n;
  }
  return counts;
}

// Rows that differ between the expected JSON rows and what userId owns in
// the table, compared column by column in Postgres (both directions).
async function countDifferences(client, table, expected, userId) {
  const { rows } = await client.query(
    `WITH expected AS (
       SELECT * FROM json_populate_recordset(null::public.${table}, $2::json)
     ), actual AS (
       SELECT * FROM public.${table} WHERE ${OWNED_BY[table]}
     )
     SELECT (SELECT count(*) FROM (TABLE expected EXCEPT ALL TABLE actual) d)::int AS missing,
            (SELECT count(*) FROM (TABLE actual EXCEPT ALL TABLE expected) d)::int AS extra`,
    [userId, JSON.stringify(expected)]
  );
  return rows[0];
}

async function replaceInNeon(client, rows, newUserId) {
  const report = { deleted: {}, inserted: {}, nowOwned: {} };
  await client.query('BEGIN');
  try {
    // Categories go with their workspaces, so count them first.
    const before = await countOwned(client, newUserId);
    for (const table of DELETE_ORDER) {
      if (table === 'categories') {
        report.deleted.categories = before.categories;
        continue;
      }
      const result = await client.query(
        `DELETE FROM public.${table} WHERE ${OWNED_BY[table]}`,
        [newUserId]
      );
      report.deleted[table] = result.rowCount;
    }

    for (const table of TABLES) {
      if (table === 'tasks') {
        report.inserted.tasks = 0;
        for (const batch of taskBatches(rows.tasks)) {
          report.inserted.tasks += await insertRows(client, 'tasks', batch);
        }
      } else {
        report.inserted[table] = await insertRows(client, table, rows[table]);
      }
    }

    const after = await countOwned(client, newUserId);
    const problems = [];
    for (const table of TABLES) {
      report.nowOwned[table] = after[table];
      if (after[table] !== rows[table].length) {
        problems.push(
          `${table}: expected ${rows[table].length} rows, found ${after[table]}`
        );
      }
      const diff = await countDifferences(
        client,
        table,
        rows[table],
        newUserId
      );
      if (diff.missing > 0 || diff.extra > 0) {
        problems.push(
          `${table}: ${diff.missing} exported rows missing, ${diff.extra} unexpected rows`
        );
      }
    }
    if (problems.length > 0) {
      throw new ImportError(
        `Verification failed, rolled back:\n  ${problems.join('\n  ')}`
      );
    }

    await client.query('COMMIT');
    return report;
  } catch (error) {
    await rollback(client);
    throw error;
  }
}

function printTable(columns) {
  const header = ['table', ...Object.keys(columns)];
  const lines = TABLES.map((t) => [
    t,
    ...Object.values(columns).map((c) => String(c[t])),
  ]);
  const widths = header.map((h, i) =>
    Math.max(h.length, ...lines.map((l) => l[i].length))
  );
  const format = (cells) =>
    cells
      .map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i])))
      .join('  ');
  console.log(format(header));
  for (const line of lines) console.log(format(line));
}

async function main() {
  let config;
  try {
    config = readConfig(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    return 2;
  }

  const supabase = new pg.Client({ connectionString: config.supabaseUrl });
  const neon = new pg.Client({ connectionString: config.neonUrl });
  try {
    await supabase.connect();
    await neon.connect();

    compareColumns(
      await readColumns(supabase, 'Supabase'),
      await readColumns(neon, 'Neon')
    );

    const { rows: users } = await neon.query(
      'SELECT 1 FROM neon_auth."user" WHERE id = $1',
      [config.newUserId]
    );
    if (users.length === 0) {
      throw new ImportError('NEW_USER_ID is not a user in neon_auth."user"');
    }

    const exported = await exportFromSupabase(supabase, config.oldUserId);
    checkSelfContained(exported);
    const rows = rewriteOwner(exported, config.oldUserId, config.newUserId);
    const exportedCounts = Object.fromEntries(
      TABLES.map((t) => [t, exported[t].length])
    );
    const subtasks = rows.tasks.filter((t) => t.parent_task_id !== null);

    console.log(`Mode: ${config.write ? 'WRITE' : 'dry run'}`);
    console.log(`Tasks with a parent: ${subtasks.length}\n`);

    if (!config.write) {
      const current = await countOwned(neon, config.newUserId);
      printTable({ 'to delete': current, 'to insert': exportedCounts });
      console.log('\nDry run: nothing written. Pass --write to replace.');
      return 0;
    }

    const report = await replaceInNeon(neon, rows, config.newUserId);
    printTable({
      exported: exportedCounts,
      deleted: report.deleted,
      inserted: report.inserted,
      'now owned': report.nowOwned,
    });
    console.log(
      '\nCommitted. NEW_USER_ID owns exactly the exported rows (ids and values checked).'
    );
    return 0;
  } catch (error) {
    console.error(
      error instanceof ImportError ? error.message : `Failed: ${error.message}`
    );
    return 1;
  } finally {
    // Closing errors don't matter once the outcome is reported.
    await supabase.end().catch(() => {});
    await neon.end().catch(() => {});
  }
}

process.exitCode = await main();
