import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  // Проверяем авторизацию
  if (!ctx.user && !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  
  // Создаём объект user из доступных данных
  const user = ctx.user || {
    userId: (ctx.session as any)?.userId,
    username: (ctx.session as any)?.user?.name,
  };
  
  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});