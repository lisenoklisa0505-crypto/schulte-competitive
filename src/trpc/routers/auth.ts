import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { auth } from '@/lib/auth';

export const authRouter = router({
  register: publicProcedure
    .input(z.object({ username: z.string().min(3), password: z.string().min(6), email: z.string().email() }))
    .mutation(async ({ input }) => {
      const result = await auth.api.signUpEmail({
        body: { 
          name: input.username, 
          email: input.email, 
          password: input.password 
        },
      });
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