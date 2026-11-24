"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const node_crypto_1 = __importDefault(require("node:crypto"));
const db_1 = require("../db");
const security_1 = require("../security");
const auth_1 = require("../middleware/auth");
const config_1 = require("../config");
const r = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(2).max(80).trim(),
    password: zod_1.z.string().min(1).max(200),
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(12).max(128),
});
// Login
r.post('/login', async (req, res, next) => {
    try {
        const p = loginSchema.parse(req.body);
        const q = await db_1.pool.query(`
        SELECT
          id,
          estate_id,
          role,
          password_hash,
          active,
          must_change_password
        FROM users
        WHERE lower(username) = lower($1)
        LIMIT 2
      `, [p.username]);
        if (q.rows.length > 1) {
            return res.status(409).json({
                error: 'Username is not unique across estates. Contact your administrator.',
            });
        }
        const u = q.rows[0];
        if (!u ||
            !u.active ||
            !(await (0, security_1.verifyPassword)(u.password_hash, p.password))) {
            return res.status(401).json({
                error: 'Invalid credentials',
            });
        }
        const sid = node_crypto_1.default.randomUUID();
        const refresh = (0, security_1.opaqueToken)();
        await db_1.pool.query(`
        INSERT INTO refresh_sessions (
          id,
          user_id,
          token_hash,
          expires_at
        )
        VALUES (
          $1,
          $2,
          $3,
          now() + ($4 * interval '1 day')
        )
      `, [
            sid,
            u.id,
            (0, security_1.tokenHash)(refresh),
            config_1.config.REFRESH_TOKEN_DAYS,
        ]);
        const access = (0, security_1.accessToken)({
            sub: u.id,
            estateId: u.estate_id,
            role: u.role,
            sid,
        });
        return res.json({
            accessToken: access,
            refreshToken: refresh,
            mustChangePassword: u.must_change_password,
            user: {
                id: u.id,
                role: u.role,
            },
        });
    }
    catch (e) {
        return next(e);
    }
});
// Current authenticated user
r.get('/me', auth_1.authenticate, async (req, res, next) => {
    try {
        const q = await db_1.pool.query(`
        SELECT
          u.id,
          u.estate_id AS "estateId",
          u.role,
          u.full_name AS "fullName",
          u.username,
          u.phone,
          u.staff_id AS "staffId",
          u.must_change_password AS "mustChangePassword",
          h.id AS "houseId",
          h.house_number AS "houseNumber"
        FROM users u
        LEFT JOIN LATERAL (
          SELECT
            rh.house_id,
            rh.is_primary
          FROM resident_houses rh
          INNER JOIN houses house
            ON house.id = rh.house_id
          WHERE rh.resident_id = u.id
            AND house.estate_id = u.estate_id
            AND house.active = TRUE
          ORDER BY rh.is_primary DESC
          LIMIT 1
        ) assigned ON TRUE
        LEFT JOIN houses h
          ON h.id = assigned.house_id
        WHERE u.id = $1
          AND u.estate_id = $2
          AND u.active = TRUE
        LIMIT 1
      `, [
            req.auth.sub,
            req.auth.estateId,
        ]);
        if (!q.rows[0]) {
            return res.status(404).json({
                error: 'User account not found',
            });
        }
        return res.json({
            user: q.rows[0],
        });
    }
    catch (e) {
        return next(e);
    }
});
// Logout and revoke current session
r.post('/logout', auth_1.authenticate, async (req, res, next) => {
    try {
        await db_1.pool.query(`
        UPDATE refresh_sessions
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE id = $1
          AND user_id = $2
      `, [
            req.auth.sid,
            req.auth.sub,
        ]);
        return res.json({
            ok: true,
            message: 'You have been signed out.',
        });
    }
    catch (e) {
        return next(e);
    }
});
// Change password
r.post('/change-password', auth_1.authenticate, async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const p = changePasswordSchema.parse(req.body);
        await client.query('BEGIN');
        const q = await client.query(`
        SELECT password_hash
        FROM users
        WHERE id = $1
          AND estate_id = $2
          AND active = TRUE
        FOR UPDATE
      `, [
            req.auth.sub,
            req.auth.estateId,
        ]);
        if (!q.rows[0] ||
            !(await (0, security_1.verifyPassword)(q.rows[0].password_hash, p.currentPassword))) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Current password is incorrect',
            });
        }
        const newHash = await (0, security_1.hashPassword)(p.newPassword);
        await client.query(`
        UPDATE users
        SET
          password_hash = $1,
          must_change_password = FALSE,
          password_changed_at = NOW()
        WHERE id = $2
          AND estate_id = $3
      `, [
            newHash,
            req.auth.sub,
            req.auth.estateId,
        ]);
        await client.query(`
        UPDATE refresh_sessions
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE user_id = $1
      `, [req.auth.sub]);
        await client.query('COMMIT');
        return res.json({
            ok: true,
            message: 'Password changed. Please sign in again.',
        });
    }
    catch (e) {
        await client.query('ROLLBACK');
        return next(e);
    }
    finally {
        client.release();
    }
});
// Register Expo push token
r.post('/push-token', auth_1.authenticate, async (req, res, next) => {
    try {
        const p = zod_1.z.object({
            token: zod_1.z.string().min(10).max(500),
        }).parse(req.body);
        await db_1.pool.query(`
        UPDATE users
        SET expo_push_token = $1
        WHERE id = $2
          AND estate_id = $3
          AND active = TRUE
      `, [
            p.token,
            req.auth.sub,
            req.auth.estateId,
        ]);
        return res.json({
            ok: true,
        });
    }
    catch (e) {
        return next(e);
    }
});
exports.default = r;
