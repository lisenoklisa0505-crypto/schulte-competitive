import { auth } from "@/lib/auth";

export async function createContext({ req }: { req: Request }) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    return { session, headers: req.headers };
  } catch {
    return { session: null, headers: req.headers };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;