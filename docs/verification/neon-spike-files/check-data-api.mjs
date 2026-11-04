// Spike: exercise the ported schema over Neon Data API with real Managed Better Auth JWTs.
import { NeonPostgrestClient, fetchWithToken } from '@neon/postgrest-js';
import { PostgrestParser } from '@supabase-cache-helpers/postgrest-core';

const AUTH = process.env.NEON_AUTH_URL; // e.g. https://ep-xxx.neonauth.<region>.aws.neon.tech/neondb/auth
const API = process.env.NEON_DATA_API_URL; // e.g. https://ep-xxx.apirest.<region>.aws.neon.tech/neondb/rest/v1
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:3000'; // must be a trusted origin (localhost allowed on dev branches)
if (!AUTH || !API) {
  console.error('Set NEON_AUTH_URL and NEON_DATA_API_URL');
  process.exit(2);
}
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok: !!ok, detail });
};

async function signUp(email, password, name) {
  const r = await fetch(`${AUTH}/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email, password, name, callbackURL: ORIGIN }),
  });
  const body = await r.json().catch(() => null);
  const cookies = r.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  return { status: r.status, body, cookies };
}
async function jwt(cookies) {
  const r = await fetch(`${AUTH}/get-session`, {
    headers: { Cookie: cookies, Origin: ORIGIN },
  });
  return r.headers.get('set-auth-jwt');
}
const client = (token) =>
  new NeonPostgrestClient({
    dataApiUrl: API,
    options: { global: { fetch: fetchWithToken(async () => token) } },
  });

const stamp = Date.now();
const a = await signUp(
  `spike-a-${stamp}@example.com`,
  'spike-password-123',
  'Spike A'
);
const b = await signUp(
  `spike-b-${stamp}@example.com`,
  'spike-password-123',
  'Spike B'
);
check('sign-up A', a.status === 200, a.status);
check('sign-up B', b.status === 200, b.status);
const short = await signUp(`spike-c-${stamp}@example.com`, '1234567', 'Short');
check('7-char password rejected by managed server', short.status !== 200, {
  status: short.status,
  code: short.body?.code,
});
const tA = await jwt(a.cookies),
  tB = await jwt(b.cookies);
check('JWT from get-session (A,B)', tA && tB, null);
const idA = a.body?.user?.id,
  idB = b.body?.user?.id;
const A = client(tA),
  B = client(tB);

// anonymous request
const anon = await fetch(`${API}/tasks?select=*`);
check('no token: no data', anon.status >= 400, {
  status: anon.status,
  body: (await anon.text()).slice(0, 120),
});

// setup idempotency
const r1 = await A.rpc('ensure_account');
const r2 = await A.rpc('ensure_account');
check('ensure_account first call true', r1.data === true, r1.error ?? r1.data);
check(
  'ensure_account second call false',
  r2.data === false,
  r2.error ?? r2.data
);
const [p1, p2] = await Promise.all([
  B.rpc('ensure_account'),
  B.rpc('ensure_account'),
]);
check(
  'concurrent ensure_account: exactly one true',
  [p1.data, p2.data].filter((x) => x === true).length === 1,
  [p1.data, p2.data, p1.error, p2.error]
);

const count = async (c, t) =>
  (await c.from(t).select('*', { count: 'exact', head: true })).count;
const shape = {
  profiles: await count(A, 'profiles'),
  workspaces: await count(A, 'workspaces'),
  categories: await count(A, 'categories'),
  tasks: await count(A, 'tasks'),
  user_onboarding: await count(A, 'user_onboarding'),
};
check(
  'A starting rows = 1/1/3/2/1',
  JSON.stringify(shape) ===
    JSON.stringify({
      profiles: 1,
      workspaces: 1,
      categories: 3,
      tasks: 2,
      user_onboarding: 1,
    }),
  shape
);
const prof = await A.from('profiles').select('id, email, full_name').single();
check(
  'profile name/email from neon_auth.user',
  prof.data?.full_name === 'Spike A' && prof.data?.id === idA,
  prof.data ?? prof.error
);

// isolation
const bTasks = await B.from('tasks').select('user_id');
check(
  'B sees only own tasks',
  bTasks.data?.length === 2 && bTasks.data.every((t) => t.user_id === idB),
  bTasks.data?.length
);
const aTask = (
  await A.from('tasks').select('id, workspace_id').limit(1).single()
).data;
const bUpd = await B.from('tasks')
  .update({ title: 'hacked' })
  .eq('id', aTask.id)
  .select();
check(
  'B cannot update A task',
  (bUpd.data?.length ?? 0) === 0,
  bUpd.error ?? bUpd.data
);
const bIns = await B.from('tasks').insert({
  user_id: idA,
  workspace_id: aTask.workspace_id,
  title: 'x',
});
check('B cannot insert as A', !!bIns.error, bIns.error?.code);
const calc = await A.rpc('calculate_next_recurrence', {});
check(
  'calculate_next_recurrence not callable',
  !!calc.error,
  calc.error?.code + ' ' + calc.error?.message
);
const anonRpc = await fetch(`${API}/rpc/ensure_account`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
});
check(
  'ensure_account refused without token',
  anonRpc.status >= 400,
  anonRpc.status
);

// recurring: complete then undo
const today = new Date().toISOString().slice(0, 10);
const rt = await A.from('recurring_tasks')
  .insert({
    user_id: idA,
    workspace_id: aTask.workspace_id,
    title: 'Daily',
    recurrence_type: 'fixed_daily',
    interval_days: 1,
    start_date: today,
    next_due_date: today,
  })
  .select()
  .single();
check('create recurring template', !rt.error, rt.error);
const inst = (
  await A.from('tasks')
    .insert({
      user_id: idA,
      workspace_id: aTask.workspace_id,
      recurring_task_id: rt.data.id,
      title: 'Daily',
      scheduled_date: today,
    })
    .select()
    .single()
).data;
await A.from('tasks')
  .update({ is_completed: true, completed_at: new Date().toISOString() })
  .eq('id', inst.id);
const afterDone = (
  await A.from('tasks')
    .select('id, scheduled_date')
    .eq('recurring_task_id', rt.data.id)
).data;
check(
  'completion generates next instance',
  afterDone.length === 2,
  afterDone.map((t) => t.scheduled_date)
);
await A.from('tasks')
  .update({ is_completed: false, completed_at: null })
  .eq('id', inst.id);
const afterUndo = (
  await A.from('tasks').select('id').eq('recurring_task_id', rt.data.id)
).data;
check(
  'undo retracts generated instance (migration 0014)',
  afterUndo.length === 1,
  afterUndo.length
);

// embedded selects + cache-helpers key parsing
const q = A.from('tasks')
  .select(
    `*, category:categories(id, name, color, icon), subtasks:tasks!parent_task_id(id, title, is_completed, position)`
  )
  .eq('scheduled_date', today)
  .is('parent_task_id', null)
  .order('position', { ascending: true });
const parsed = new PostgrestParser(q);
check(
  'cache-helpers parses Neon query',
  parsed.table === 'tasks' &&
    parsed.paths.some((p) => (p.alias ?? p.path).startsWith('category.')),
  {
    table: parsed.table,
    paths: parsed.paths.map((p) => p.alias ?? p.path).slice(0, 8),
    filters: parsed.filters?.length,
    order: parsed.orderByKey,
  }
);
const res = await q;
check(
  'embedded select returns category + subtasks',
  !res.error &&
    Array.isArray(res.data) &&
    res.data.length > 0 &&
    'category' in res.data[0] &&
    Array.isArray(res.data[0].subtasks),
  res.error ?? Object.keys(res.data?.[0] ?? {})
);

console.log(JSON.stringify({ idA, idB, results }, null, 1));

const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`${failed.length} check(s) failed`);
  process.exit(1);
}
