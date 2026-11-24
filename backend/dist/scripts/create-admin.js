"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../db");
const security_1 = require("../security");
async function main() {
    const c = await db_1.pool.connect();
    try {
        await c.query('BEGIN');
        let e = await c.query(`
        SELECT id
        FROM estates
        WHERE name = $1
      `, [
            process.env.BOOTSTRAP_ADMIN_ESTATE || 'Your Estate',
        ]);
        let estateId = e.rows[0]?.id;
        if (!estateId) {
            const x = await c.query(`
          INSERT INTO estates(name)
          VALUES($1)
          RETURNING id
        `, [
                process.env.BOOTSTRAP_ADMIN_ESTATE || 'Your Estate',
            ]);
            estateId = x.rows[0].id;
        }
        const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Estate Administrator';
        const username = process.env.BOOTSTRAP_ADMIN_USERNAME || 'admin';
        const phone = process.env.BOOTSTRAP_ADMIN_PHONE || '08000000000';
        const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
        if (!password || password.length < 12) {
            throw new Error('Set BOOTSTRAP_ADMIN_PASSWORD to at least 12 characters in backend/.env');
        }
        await c.query(`
        INSERT INTO users (
          estate_id,
          role,
          full_name,
          username,
          phone,
          password_hash,
          must_change_password
        )
        VALUES (
          $1,
          'ADMIN',
          $2,
          $3,
          $4,
          $5,
          false
        )
        ON CONFLICT(estate_id, username)
        DO NOTHING
      `, [
            estateId,
            name,
            username,
            phone,
            await (0, security_1.hashPassword)(password),
        ]);
        await c.query('COMMIT');
        console.log('Admin bootstrap complete. Remove bootstrap password from deployment environment.');
    }
    catch (e) {
        await c.query('ROLLBACK');
        throw e;
    }
    finally {
        c.release();
        await db_1.pool.end();
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
