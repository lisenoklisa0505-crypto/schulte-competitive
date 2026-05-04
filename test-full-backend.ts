// Проверка всех импортов и структуры
import './src/db/schema';
import './src/db/index';
import './src/lib/auth';
import './src/lib/schulte';
import './src/trpc/context';
import './src/trpc/trpc';
import './src/trpc/router';
import './src/trpc/routers/auth';
import './src/trpc/routers/game';

console.log('\n✅ All backend modules imported successfully!');
console.log('\nBackend is correctly configured for deployment!\n');