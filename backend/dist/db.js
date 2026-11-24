"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const config_1 = require("./config");
exports.pool = new pg_1.Pool({
    connectionString: config_1.config.DATABASE_URL,
    ssl: config_1.config.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: true,
        }
        : undefined,
    max: 15,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on('error', (e) => {
    console.error('Unexpected PostgreSQL pool error', e);
});
