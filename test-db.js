const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Database connected!', res.rows[0]);
  } catch (error) {
    console.error('❌ Database error:', error.message);
    console.log('\nPlease check:');
    console.log('1. PostgreSQL is running');
    console.log('2. DATABASE_URL in .env is correct');
  }
}

test();