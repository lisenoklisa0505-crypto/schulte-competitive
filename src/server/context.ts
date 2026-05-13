import { auth } from "@/lib/auth";

export async function createContext(opts: { req: Request }) {
  try {
    const session = await auth.api.getSession({
      headers: opts.req.headers,
    });
    return { session, headers: opts.req.headers };
  } catch {
    return { session: null, headers: opts.req.headers };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
