import { Pool } from 'pg';

import { config } from './config';

export const pool = new Pool({
  connectionString: config.DATABASE_URL,

  ssl: config.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: true,
      }
    : undefined,

  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (e) => {
  console.error('Unexpected PostgreSQL pool error', e);
});