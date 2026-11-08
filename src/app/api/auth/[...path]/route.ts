import { getAuth } from '@/lib/auth/server';

type Handlers = ReturnType<ReturnType<typeof getAuth>['handler']>;
type Args = Parameters<Handlers['GET']>;

// Delegates to the lazily created auth instance, so the build never needs the
// Neon Auth secrets.
export const GET = (...args: Args) =>
  getAuth()
    .handler()
    .GET(...args);
export const POST = (...args: Args) =>
  getAuth()
    .handler()
    .POST(...args);
export const PUT = (...args: Args) =>
  getAuth()
    .handler()
    .PUT(...args);
export const DELETE = (...args: Args) =>
  getAuth()
    .handler()
    .DELETE(...args);
export const PATCH = (...args: Args) =>
  getAuth()
    .handler()
    .PATCH(...args);
