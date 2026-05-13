import { router, publicProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateJWT } from '@/lib/auth';

export const authRouter = router({
  register: publicProcedure
    .input(z.object({ username: z.string().min(3), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const existing = await db.select().from(users).where(eq(users.username, input.username));
      
      if (existing.length) {
        throw new Error('Пользователь с таким именем уже существует');
      }
      
      const hashed = await hashPassword(input.password);
      const newUser = await db.insert(users).values({
        username: input.username,
        password: hashed,
      }).returning();
      
      const token = generateJWT(newUser[0].id, input.username);
      
      return { 
        success: true, 
        token, 
        user: { 
          id: newUser[0].id, 
          username: input.username, 
          rating: newUser[0].rating ?? 1000,
          wins: newUser[0].wins ?? 0,
          bestTime: newUser[0].bestTime ?? 0
        } 
      };
    }),
  
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ input }) => {
      const usersList = await db.select().from(users).where(eq(users.username, input.username));
      if (!usersList.length) throw new Error('Пользователь не найден');
      
      const valid = await verifyPassword(input.password, usersList[0].password);
      if (!valid) throw new Error('Неверный пароль');
      
      const token = generateJWT(usersList[0].id, input.username);
      
      return { 
        success: true, 
        token, 
        user: { 
          id: usersList[0].id, 
          username: input.username, 
          rating: usersList[0].rating ?? 1000,
          wins: usersList[0].wins ?? 0,
          bestTime: usersList[0].bestTime ?? 0
        } 
      };
    }),
  
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const usersList = await db.select().from(users).where(eq(users.id, ctx.user.userId));
      if (!usersList.length) throw new Error('Пользователь не найден');
      return { 
        id: usersList[0].id, 
        username: usersList[0].username, 
        rating: usersList[0].rating ?? 1000,
        wins: usersList[0].wins ?? 0,
        bestTime: usersList[0].bestTime ?? 0
      };
    }),
});