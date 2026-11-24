import fs from 'node:fs';
import path from 'node:path';

import { pool } from '../db';

async function main() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations/001_initial.sql'),
    'utf8',
  );

  await pool.query(sql);

  console.log('Migration applied');

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});