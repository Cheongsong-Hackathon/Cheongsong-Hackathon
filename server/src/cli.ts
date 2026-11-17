import { pool } from './db.js';
import { migrate, seed } from './setup.js';

const cmd = process.argv[2];
if (cmd === 'migrate') await migrate();
else if (cmd === 'seed') await seed();
else throw new Error('usage: cli migrate|seed');
console.log(`${cmd} 완료`);
await pool.end();
