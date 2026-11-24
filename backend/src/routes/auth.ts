
import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';

import { pool } from '../db';

import {
  verifyPassword,
  hashPassword,
  accessToken,
  opaqueToken,
  tokenHash,
} from '../security';

import { authenticate } from '../middleware/auth';

import { config } from '../config';

const r = Router();

const loginSchema = z.object({
  username: z.string().min(2).max(80).trim(),
  password: z.string().min(1).max(200),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

// Login
r.post('/login', async (req, res, next) => {
  try {
    const p = loginSchema.parse(req.body);

    const q = await pool.query(
      `
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
      `,
      [p.username],
    );

    if (q.rows.length > 1) {
      return res.status(409).json({
        error: 'Username is not unique across estates. Contact your administrator.',
      });
    }

    const u = q.rows[0];

    if (
      !u ||
      !u.active ||
      !(await verifyPassword(u.password_hash, p.password))
    ) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    const sid = crypto.randomUUID();
    const refresh = opaqueToken();

    await pool.query(
      `
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
      `,
      [
        sid,
        u.id,
        tokenHash(refresh),
        config.REFRESH_TOKEN_DAYS,
      ],
    );

    const access = accessToken({
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
  } catch (e) {
    return next(e);
  }
});

// Current authenticated user
r.get('/me', authenticate, async (req, res, next) => {
  try {
    const q = await pool.query(
      `
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
      `,
      [
        req.auth!.sub,
        req.auth!.estateId,
      ],
    );

    if (!q.rows[0]) {
      return res.status(404).json({
        error: 'User account not found',
      });
    }

    return res.json({
      user: q.rows[0],
    });
  } catch (e) {
    return next(e);
  }
});

// Logout and revoke current session
r.post('/logout', authenticate, async (req, res, next) => {
  try {
    await pool.query(
      `
        UPDATE refresh_sessions
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE id = $1
          AND user_id = $2
      `,
      [
        req.auth!.sid,
        req.auth!.sub,
      ],
    );

    return res.json({
      ok: true,
      message: 'You have been signed out.',
    });
  } catch (e) {
    return next(e);
  }
});

// Change password
r.post('/change-password', authenticate, async (req, res, next) => {
  const client = await pool.connect();

  try {
    const p = changePasswordSchema.parse(req.body);

    await client.query('BEGIN');

    const q = await client.query(
      `
        SELECT password_hash
        FROM users
        WHERE id = $1
          AND estate_id = $2
          AND active = TRUE
        FOR UPDATE
      `,
      [
        req.auth!.sub,
        req.auth!.estateId,
      ],
    );

    if (
      !q.rows[0] ||
      !(await verifyPassword(
        q.rows[0].password_hash,
        p.currentPassword,
      ))
    ) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        error: 'Current password is incorrect',
      });
    }

    const newHash = await hashPassword(p.newPassword);

    await client.query(
      `
        UPDATE users
        SET
          password_hash = $1,
          must_change_password = FALSE,
          password_changed_at = NOW()
        WHERE id = $2
          AND estate_id = $3
      `,
      [
        newHash,
        req.auth!.sub,
        req.auth!.estateId,
      ],
    );

    await client.query(
      `
        UPDATE refresh_sessions
        SET revoked_at = COALESCE(revoked_at, NOW())
        WHERE user_id = $1
      `,
      [req.auth!.sub],
    );

    await client.query('COMMIT');

    return res.json({
      ok: true,
      message: 'Password changed. Please sign in again.',
    });
  } catch (e) {
    await client.query('ROLLBACK');
    return next(e);
  } finally {
    client.release();
  }
});

// Register Expo push token
r.post('/push-token', authenticate, async (req, res, next) => {
  try {
    const p = z.object({
      token: z.string().min(10).max(500),
    }).parse(req.body);

    await pool.query(
      `
        UPDATE users
        SET expo_push_token = $1
        WHERE id = $2
          AND estate_id = $3
          AND active = TRUE
      `,
      [
        p.token,
        req.auth!.sub,
        req.auth!.estateId,
      ],
    );

    return res.json({
      ok: true,
    });
  } catch (e) {
    return next(e);
  }
});

export default r;
