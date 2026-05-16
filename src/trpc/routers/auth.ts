import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const authRouter = router({
  register: publicProcedure
    .input(z.object({ username: z.string().min(3), password: z.string().min(6), email: z.string().email() }))
    .mutation(async ({ input }) => {
      // Регистрация через better-auth
      const result = await auth.api.signUpEmail({
        body: { 
          name: input.username,  // better-auth сохраняет в поле name
          email: input.email, 
          password: input.password 
        },
      });
      
      // Обновляем username в таблице users (если нужно отдельное поле)
      if (result.user?.id) {
        await db.update(users)
          .set({ username: input.username })
          .where(eq(users.id, result.user.id));
      }
      
      return result;
    }),
  
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const result = await auth.api.signInEmail({
        body: { email: input.email, password: input.password },
      });
      return result;
    }),
  
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.session;
  }),
});