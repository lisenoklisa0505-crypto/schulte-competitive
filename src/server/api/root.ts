import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

// ========== AUTH ROUTER ==========
const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.session || null;
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
  getUser: protectedProcedure
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
