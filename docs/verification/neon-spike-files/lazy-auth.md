# Lazy auth instance (spike prototype)

From the spike's probe app. A module-level `createNeonAuth` fails `next build` without `NEON_AUTH_COOKIE_SECRET`; this memoized getter builds with every `NEON_AUTH_*` variable unset and worked at runtime under `next start`. The probe route shows the server-side `token()` cast (typed `unknown` in `@neon/auth` 0.8.2) and a server Data API client calling `ensure_account()`. Relative imports reflect the spike's layout, not this repo's.

## Auth instance

```ts
import { createNeonAuth } from '@neon/auth/next/server';
let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAuth() {
  instance ??= createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET!, sameSite: 'lax' },
  });
  return instance;
}
```

## Catch-all `/api/auth` route

```ts
import { getAuth } from '../../../../lib/auth';
type H = ReturnType<ReturnType<typeof getAuth>['handler']>;
type Args = Parameters<H['GET']>;
export const GET = (...a: Args) =>
  getAuth()
    .handler()
    .GET(...a);
export const POST = (...a: Args) =>
  getAuth()
    .handler()
    .POST(...a);
```

## Probe route: server token and Data API

```ts
import { NeonPostgrestClient, fetchWithToken } from '@neon/postgrest-js';
import { getAuth } from '../../../lib/auth';
export const dynamic = 'force-dynamic';
type TokenFn = () => Promise<{
  data: { token: string } | null;
  error: unknown;
}>;
export async function GET() {
  const auth = getAuth();
  const { data: session } = await auth.getSession();
  const tokenFn = (auth as unknown as { token: TokenFn }).token;
  const tok = await tokenFn();
  const token = tok.data?.token ?? null;
  const db = new NeonPostgrestClient({
    dataApiUrl: process.env.DATA_API_URL!,
    options: { global: { fetch: fetchWithToken(async () => token) } },
  });
  const rpc = token ? await db.rpc('ensure_account') : null;
  const ws = token
    ? await db.from('workspaces').select('name, categories(name)')
    : null;
  return Response.json({
    sessionUser: session?.user?.id ?? null,
    tokenTypeof: typeof auth.token,
    tokenOk: !!token,
    tokenErr: tok.error ?? null,
    rpc: rpc && { data: rpc.data, error: rpc.error },
    ws: ws && { data: ws.data, error: ws.error },
  });
}
```
