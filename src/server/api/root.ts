import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

// ========== AUTH ROUTER ==========
const authRouter = router({
  me: publicProcedure.query(async () => {
    try {
      return null;
    } catch (error) {
      return null;
    }
  }),
});

// ========== GAME ROUTER ==========
const gameRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { message: `Hello ${input.name}` };
    }),
});

// ========== USER ROUTER ==========
const userRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return { id: input.id, name: "User" };
    }),
});

// ========== MAIN APP ROUTER ==========
export const appRouter = router({
  auth: authRouter,
  game: gameRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;