import { auth } from "@/lib/auth";
import { inferAsyncReturnType } from "@trpc/server";

export async function createContext({ req }: { req: Request }) {
  let session = null;
  
  try {
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    session = await auth.api.getSession({
      headers,
    });
  } catch (error) {
    console.error("Auth error:", error);
  }
  
  return { session, req };
}

export type Context = inferAsyncReturnType<typeof createContext>;