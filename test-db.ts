import { db } from './src/db';
import { users, gameSessions, gamePlayers } from './src/db/schema';

async function testDatabase() {
  console.log('Testing database connection...');
  
  try {
    // Проверка подключения
    const result = await db.select().from(users).limit(1);
    console.log('Database connection: ✅');
    console.log('Tables exist: ✅');
  } catch (error) {
    console.error('Database error:', error);
    console.log('\n❌ Please check:');
    console.log('1. PostgreSQL is running');
    console.log('2. DATABASE_URL in .env is correct');
    console.log('3. Run migrations: npx drizzle-kit migrate');
  }
}

testDatabase();