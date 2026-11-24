import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../db';

import {
  authenticate,
  allow,
} from '../middleware/auth';

import {
  hashPassword,
  opaqueToken,
  tokenHash,
} from '../security';

import { audit } from '../services/audit';

const r = Router();

r.use(authenticate, allow('ADMIN'));

r.post('/users', async (req, res, next) => {
  try {
    const p = z.object({
      role: z.enum(['RESIDENT', 'SECURITY']),
      fullName: z.string().min(2),
      username: z.string().min(3),
      phone: z.string().min(7),
      houseId: z.string().uuid().optional(),
      staffId: z.string().optional(),
      temporaryPassword: z.string().min(12),
    }).parse(req.body);

    if (p.role === 'RESIDENT' && !p.houseId) {
      return res.status(400).json({
        error: 'Resident must be assigned to a house',
      });
    }

    const c = await pool.connect();

    try {
      await c.query('BEGIN');

      const q = await c.query(
        `
          INSERT INTO users (
            estate_id,
            role,
            full_name,
            username,
            phone,
            password_hash,
            must_change_password,
            staff_id
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            true,
            $7
          )
          RETURNING id
        `,
        [
          req.auth!.estateId,
          p.role,
          p.fullName,
          p.username,
          p.phone,
          await hashPassword(p.temporaryPassword),
          p.role === 'SECURITY' ? p.staffId : null,
        ],
      );

      if (p.houseId) {
        await c.query(
          `
            INSERT INTO resident_houses (
              resident_id,
              house_id,
              is_primary
            )
            VALUES ($1, $2, true)
          `,
          [
            q.rows[0].id,
            p.houseId,
          ],
        );
      }

      await c.query('COMMIT');

      await audit(
        req.auth!.estateId,
        req.auth!.sub,
        'ACCOUNT_CREATED',
        null,
        {
          userId: q.rows[0].id,
          role: p.role,
        },
      );

      res.status(201).json({
        id: q.rows[0].id,
        mustChangePassword: true,
      });
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      c.release();
    }
  } catch (e) {
    next(e);
  }
});

r.get('/houses', async (req, res, next) => {
  try {
    const q = await pool.query(
      `
        SELECT id, house_number
        FROM houses
        WHERE estate_id = $1
          AND active = true
        ORDER BY house_number
      `,
      [req.auth!.estateId],
    );

    res.json(q.rows);
  } catch (e) {
    next(e);
  }
});

r.get('/users', async (req, res, next) => {
  try {
    const q = await pool.query(
      `
        SELECT
          id,
          role,
          full_name,
          username,
          phone,
          staff_id,
          active
        FROM users
        WHERE estate_id = $1
        ORDER BY full_name
      `,
      [req.auth!.estateId],
    );

    res.json(q.rows);
  } catch (e) {
    next(e);
  }
});

r.patch('/users/:id/status', async (req, res, next) => {
  try {
    const p = z.object({
      active: z.boolean(),
    }).parse(req.body);

    await pool.query(
      `
        UPDATE users
        SET active = $1
        WHERE id = $2
          AND estate_id = $3
      `,
      [
        p.active,
        req.params.id,
        req.auth!.estateId,
      ],
    );

    await audit(
      req.auth!.estateId,
      req.auth!.sub,
      'ACCOUNT_STATUS_CHANGED',
      null,
      {
        userId: req.params.id,
        active: p.active,
      },
    );

    res.json({
      ok: true,
    });
  } catch (e) {
    next(e);
  }
});

export default r;