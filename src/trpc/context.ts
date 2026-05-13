import { auth } from "@/lib/auth";
import { verifyJWT } from "@/lib/auth";

export async function createContext({ req }: { req: Request }) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  let user = null;
  
  if (token) {
    user = verifyJWT(token);
  }
  
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });
    return { session, user, headers: req.headers };
  } catch {
    return { session: null, user, headers: req.headers };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;