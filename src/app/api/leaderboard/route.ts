import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, matchHistory } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const leaderboard = await db
      .select({
        id: users.id,
        name: users.name,
        wins: users.wins,
        bestTime: users.bestTime,
      })
      .from(users)
      .orderBy(desc(users.wins))
      .limit(50);
    
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json([]);
  }
}