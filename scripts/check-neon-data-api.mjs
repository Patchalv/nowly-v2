// Checks a Neon branch's Data API and Neon Auth against the Neon migration set
// (neon/migrations). Uses only Node built-ins, so it runs with `node` and no
// install. Needs real Neon credentials: run it locally against a disposable
// branch, never in CI. It creates throwaway users; delete the branch after.
//
//   NEON_AUTH_URL=https://ep-xxx.neonauth.<region>.aws.neon.tech/neondb/auth \
//   NEON_DATA_API_URL=https://ep-xxx.apirest.<region>.aws.neon.tech/neondb/rest/v1 \
//   node scripts/check-neon-data-api.mjs
//
// ORIGIN defaults to http://localhost:3000 and must be a trusted origin in
// Neon Auth. Exits 1 if any check fails, 2 if configuration is missing.

const AUTH = process.env.NEON_AUTH_URL;
const API = process.env.NEON_DATA_API_URL;
const ORIGIN = process.env.ORIGIN ?? 'http://localhost:3000';
const EXPECTED_CHECKS = 19;

if (!AUTH || !API) {
  console.error('Set NEON_AUTH_URL and NEON_DATA_API_URL');
  process.exit(2);
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      ${JSON.stringify(detail)}`);
}

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

// Minimal PostgREST call. `single` asks for one object instead of an array;
// `count` asks for an exact row count via a HEAD request.
async function rest(token, method, path, { body, single, count } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (single) headers.Accept = 'application/vnd.pgrst.object+json';
  if (count) headers.Prefer = 'count=exact';
  else if (method === 'POST' || method === 'PATCH') {
    headers.Prefer = 'return=representation';
  }
  const r = await fetch(`${API}/${path}`, {
    method: count ? 'HEAD' : method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = count ? '' : await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  const ok = r.status < 400;
  const range = r.headers.get('content-range');
  return {
    status: r.status,
    data: ok ? json : null,
    error: ok ? null : (json ?? { status: r.status }),
    count: range ? Number(range.split('/')[1]) : null,
  };
}

async function main() {
  const stamp = Date.now();
  const password = 'check-password-123';
  const a = await signUp(`check-a-${stamp}@example.com`, password, 'Check A');
  const b = await signUp(`check-b-${stamp}@example.com`, password, 'Check B');
  check('sign-up A', a.status === 200, a.status);
  check('sign-up B', b.status === 200, b.status);

  const short = await signUp(
    `check-c-${stamp}@example.com`,
    '1234567',
    'Short'
  );
  check('7-char password rejected', short.status !== 200, {
    status: short.status,
    code: short.body?.code,
  });

  const tA = await jwt(a.cookies);
  const tB = await jwt(b.cookies);
  check('JWT from get-session (A, B)', tA && tB, { tA: !!tA, tB: !!tB });
  const idA = a.body?.user?.id;
  const idB = b.body?.user?.id;

  const anon = await rest(null, 'GET', 'tasks?select=*');
  check('no token: no data', anon.status >= 400, anon.status);

  const r1 = await rest(tA, 'POST', 'rpc/ensure_account', { body: {} });
  const r2 = await rest(tA, 'POST', 'rpc/ensure_account', { body: {} });
  check(
    'ensure_account first call true',
    r1.data === true,
    r1.error ?? r1.data
  );
  check(
    'ensure_account second call false',
    r2.data === false,
    r2.error ?? r2.data
  );
  const [p1, p2] = await Promise.all([
    rest(tB, 'POST', 'rpc/ensure_account', { body: {} }),
    rest(tB, 'POST', 'rpc/ensure_account', { body: {} }),
  ]);
  check(
    'concurrent ensure_account: exactly one true',
    [p1.data, p2.data].filter((x) => x === true).length === 1,
    [p1.data, p2.data, p1.error, p2.error]
  );

  const shape = {};
  for (const t of [
    'profiles',
    'workspaces',
    'categories',
    'tasks',
    'user_onboarding',
  ]) {
    shape[t] = (await rest(tA, 'GET', `${t}?select=*`, { count: true })).count;
  }
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

  const prof = await rest(tA, 'GET', 'profiles?select=id,email,full_name', {
    single: true,
  });
  check(
    'profile name/email from neon_auth.user',
    prof.data?.full_name === 'Check A' &&
      prof.data?.email === `check-a-${stamp}@example.com` &&
      prof.data?.id === idA,
    prof.data ?? prof.error
  );

  const bTasks = await rest(tB, 'GET', 'tasks?select=user_id');
  check(
    'B sees only own tasks',
    bTasks.data?.length === 2 && bTasks.data.every((t) => t.user_id === idB),
    bTasks.data ?? bTasks.error
  );

  const aTask = (
    await rest(tA, 'GET', 'tasks?select=id,workspace_id&limit=1', {
      single: true,
    })
  ).data;
  const bUpd = await rest(tB, 'PATCH', `tasks?id=eq.${aTask.id}`, {
    body: { title: 'hacked' },
  });
  check(
    'B cannot update A task',
    (bUpd.data?.length ?? 0) === 0,
    bUpd.error ?? bUpd.data
  );
  const bIns = await rest(tB, 'POST', 'tasks', {
    body: { user_id: idA, workspace_id: aTask.workspace_id, title: 'x' },
  });
  check('B cannot insert as A', !!bIns.error, bIns.error?.code ?? bIns.data);

  const today = new Date().toISOString().slice(0, 10);

  // Real argument names, so the function resolves and only the missing
  // EXECUTE grant (42501) can stop the call. PGRST202 (no matching function)
  // would mean the check proved nothing.
  const calc = await rest(tA, 'POST', 'rpc/calculate_next_recurrence', {
    body: { template: {}, from_date: today },
  });
  check(
    'calculate_next_recurrence not callable',
    calc.error?.code === '42501',
    calc.error ?? calc.data
  );
  const anonRpc = await rest(null, 'POST', 'rpc/ensure_account', { body: {} });
  check(
    'ensure_account refused without token',
    anonRpc.status >= 400,
    anonRpc.status
  );

  const rt = await rest(tA, 'POST', 'recurring_tasks', {
    single: true,
    body: {
      user_id: idA,
      workspace_id: aTask.workspace_id,
      title: 'Daily',
      recurrence_type: 'fixed_daily',
      interval_days: 1,
      start_date: today,
      next_due_date: today,
    },
  });
  check('create recurring template', !rt.error, rt.error);

  const inst = (
    await rest(tA, 'POST', 'tasks', {
      single: true,
      body: {
        user_id: idA,
        workspace_id: aTask.workspace_id,
        recurring_task_id: rt.data.id,
        title: 'Daily',
        scheduled_date: today,
      },
    })
  ).data;
  await rest(tA, 'PATCH', `tasks?id=eq.${inst.id}`, {
    body: { is_completed: true, completed_at: new Date().toISOString() },
  });
  const afterDone = (
    await rest(
      tA,
      'GET',
      `tasks?select=id,scheduled_date&recurring_task_id=eq.${rt.data.id}`
    )
  ).data;
  check(
    'completion generates next instance',
    afterDone?.length === 2,
    afterDone?.map((t) => t.scheduled_date)
  );

  await rest(tA, 'PATCH', `tasks?id=eq.${inst.id}`, {
    body: { is_completed: false, completed_at: null },
  });
  const afterUndo = (
    await rest(tA, 'GET', `tasks?select=id&recurring_task_id=eq.${rt.data.id}`)
  ).data;
  check(
    'undo retracts generated instance (migration 0014)',
    afterUndo?.length === 1,
    afterUndo?.length
  );

  const select = encodeURIComponent(
    '*,category:categories(id,name,color,icon),subtasks:tasks!parent_task_id(id,title,is_completed,position)'
  );
  const res = await rest(
    tA,
    'GET',
    `tasks?select=${select}&scheduled_date=eq.${today}&parent_task_id=is.null&order=position.asc`
  );
  check(
    'embedded select returns category + subtasks',
    !res.error &&
      Array.isArray(res.data) &&
      res.data.length > 0 &&
      'category' in res.data[0] &&
      Array.isArray(res.data[0].subtasks),
    res.error ?? Object.keys(res.data?.[0] ?? {})
  );
}

try {
  await main();
} catch (error) {
  console.error(`Stopped early: ${error?.stack ?? error}`);
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${EXPECTED_CHECKS} passed`);
if (results.length !== EXPECTED_CHECKS || passed !== EXPECTED_CHECKS) {
  process.exit(1);
}
