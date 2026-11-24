import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../db';

import {
  authenticate,
  allow,
} from '../middleware/auth';

import {
  opaqueToken,
  tokenHash,
} from '../security';

import { audit } from '../services/audit';
import { notifyUser } from '../services/notify';

import QRCode from 'qrcode';

const r = Router();

r.use(authenticate);

async function houseFor(
  residentId: string,
  estateId: string,
) {
  const q = await pool.query(
    `
      SELECT
        h.id,
        h.house_number
      FROM resident_houses rh
      JOIN houses h
        ON h.id = rh.house_id
      WHERE rh.resident_id = $1
        AND h.estate_id = $2
        AND h.active = true
      ORDER BY rh.is_primary DESC
      LIMIT 1
    `,
    [
      residentId,
      estateId,
    ],
  );

  return q.rows[0];
}

r.post('/', allow('RESIDENT'), async (req, res, next) => {
  try {
    const p = z.object({
      fullName: z.string().min(2),
      phone: z.string().min(7),
      purpose: z.string().min(2),
      expectedAt: z.string().datetime(),
      additionalInfo: z.string().max(500).optional(),
    }).parse(req.body);

    const h = await houseFor(
      req.auth!.sub,
      req.auth!.estateId,
    );

    if (!h) {
      return res.status(400).json({
        error: 'No active house assigned',
      });
    }

    const token = opaqueToken();
    const expires = new Date(Date.now() + 24 * 3600000);

    const c = await pool.connect();

    try {
      await c.query('BEGIN');

      const q = await c.query(
        `
          INSERT INTO visitors (
            estate_id,
            resident_id,
            house_id,
            full_name,
            phone,
            purpose,
            expected_at,
            additional_info,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            'EXPECTED'
          )
          RETURNING id
        `,
        [
          req.auth!.estateId,
          req.auth!.sub,
          h.id,
          p.fullName,
          p.phone,
          p.purpose,
          p.expectedAt,
          p.additionalInfo || null,
        ],
      );

      await c.query(
        `
          INSERT INTO access_tokens (
            visitor_id,
            token_hash,
            token_type,
            expires_at
          )
          VALUES ($1, $2, 'ENTRY', $3)
        `,
        [
          q.rows[0].id,
          tokenHash(token),
          expires,
        ],
      );

      await c.query('COMMIT');

      await audit(
        req.auth!.estateId,
        req.auth!.sub,
        'VISITOR_PREREGISTERED',
        q.rows[0].id,
      );

      res.status(201).json({
        visitorId: q.rows[0].id,
        entryToken: token,
        expiresAt: expires,
        qrDataUrl: await QRCode.toDataURL(token),
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

r.get('/mine', allow('RESIDENT'), async (req, res, next) => {
  try {
    const q = await pool.query(
      `
        SELECT
          v.*,
          h.house_number
        FROM visitors v
        JOIN houses h
          ON h.id = v.house_id
        WHERE v.resident_id = $1
        ORDER BY v.created_at DESC
      `,
      [req.auth!.sub],
    );

    res.json(q.rows);
  } catch (e) {
    next(e);
  }
});

r.post('/:id/decision', allow('RESIDENT'), async (req, res, next) => {
  try {
    const p = z.object({
      decision: z.enum(['ACCEPTED', 'REJECTED']),
    }).parse(req.body);

    const c = await pool.connect();

    try {
      await c.query('BEGIN');

      const q = await c.query(
        `
          UPDATE visitors
          SET status = $1
          WHERE id = $2
            AND resident_id = $3
            AND status = 'AWAITING_APPROVAL'
          RETURNING id, estate_id
        `,
        [
          p.decision === 'ACCEPTED' ? 'APPROVED' : 'REJECTED',
          req.params.id,
          req.auth!.sub,
        ],
      );

      if (!q.rowCount) {
        await c.query('ROLLBACK');

        return res.status(409).json({
          error: 'Visit is not awaiting your decision',
        });
      }

      await c.query(
        `
          UPDATE approval_requests
          SET
            decision = $1,
            decided_by_resident_id = $2,
            decided_at = now()
          WHERE visitor_id = $3
            AND decision IS NULL
        `,
        [
          p.decision,
          req.auth!.sub,
          req.params.id,
        ],
      );

      await c.query('COMMIT');

      await audit(
        req.auth!.estateId,
        req.auth!.sub,
        'ENTRY_' + p.decision,
        req.params.id,
      );

      res.json({
        ok: true,
        status: p.decision,
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

r.post('/:id/checkout', allow('RESIDENT'), async (req, res, next) => {
  try {
    const token = opaqueToken();
    const c = await pool.connect();

    try {
      await c.query('BEGIN');

      const q = await c.query(
        `
          UPDATE visitors
          SET status = 'EXIT_REQUESTED'
          WHERE id = $1
            AND resident_id = $2
            AND status = 'INSIDE'
          RETURNING id
        `,
        [
          req.params.id,
          req.auth!.sub,
        ],
      );

      if (!q.rowCount) {
        await c.query('ROLLBACK');

        return res.status(409).json({
          error: 'Visitor is not currently inside',
        });
      }

      await c.query(
        `
          INSERT INTO access_tokens (
            visitor_id,
            token_hash,
            token_type,
            expires_at
          )
          VALUES (
            $1,
            $2,
            'EXIT',
            now() + interval '2 hours'
          )
        `,
        [
          req.params.id,
          tokenHash(token),
        ],
      );

      await c.query('COMMIT');

      await audit(
        req.auth!.estateId,
        req.auth!.sub,
        'EXIT_REQUESTED',
        req.params.id,
      );

      res.json({
        exitToken: token,
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

r.post('/:id/acknowledge', allow('RESIDENT'), async (req, res, next) => {
  try {
    const q = await pool.query(
      `
        UPDATE visitors
        SET resident_acknowledged_at = now()
        WHERE id = $1
          AND resident_id = $2
          AND status = 'EXITED'
        RETURNING id
      `,
      [
        req.params.id,
        req.auth!.sub,
      ],
    );

    if (!q.rowCount) {
      return res.status(409).json({
        error: 'Visit is not ready to acknowledge',
      });
    }

    await audit(
      req.auth!.estateId,
      req.auth!.sub,
      'EXIT_ACKNOWLEDGED',
      req.params.id,
    );

    res.json({
      ok: true,
    });
  } catch (e) {
    next(e);
  }
});

r.post('/gate/entry/lookup', allow('SECURITY'), async (req, res, next) => {
  try {
    const p = z.object({
      token: z.string().min(20),
    }).parse(req.body);

    const q = await pool.query(
      `
        SELECT
          v.id,
          v.full_name,
          v.phone,
          v.purpose,
          v.expected_at,
          v.status,
          u.full_name resident_name,
          u.phone resident_phone,
          h.house_number
        FROM access_tokens t
        JOIN visitors v
          ON v.id = t.visitor_id
        JOIN users u
          ON u.id = v.resident_id
        JOIN houses h
          ON h.id = v.house_id
        WHERE t.token_hash = $1
          AND t.token_type = 'ENTRY'
          AND t.used_at IS NULL
          AND t.expires_at > now()
          AND v.estate_id = $2
      `,
      [
        tokenHash(p.token),
        req.auth!.estateId,
      ],
    );

    if (!q.rowCount) {
      return res.status(404).json({
        error: 'Invalid, expired or already-used entry pass',
      });
    }

    res.json(q.rows[0]);
  } catch (e) {
    next(e);
  }
});

r.post(
  '/gate/:id/request-permission',
  allow('SECURITY'),
  async (req, res, next) => {
    try {
      const q = await pool.query(
        `
          UPDATE visitors
          SET status = 'AWAITING_APPROVAL'
          WHERE id = $1
            AND estate_id = $2
            AND status = 'EXPECTED'
          RETURNING resident_id
        `,
        [
          req.params.id,
          req.auth!.estateId,
        ],
      );

      if (!q.rowCount) {
        return res.status(409).json({
          error: 'Visitor is not in EXPECTED state',
        });
      }

      await pool.query(
        `
          INSERT INTO approval_requests (
            visitor_id,
            requested_by_guard_id
          )
          VALUES ($1, $2)
        `,
        [
          req.params.id,
          req.auth!.sub,
        ],
      );

      await audit(
        req.auth!.estateId,
        req.auth!.sub,
        'ENTRY_PERMISSION_REQUESTED',
        req.params.id,
      );

      await notifyUser(
        q.rows[0].resident_id,
        'Visitor at estate gate',
        'A visitor is requesting entry.',
        {
          visitorId: req.params.id,
        },
      );

      req.app
        .get('io')
        .to(req.auth!.estateId)
        .emit('visitor:approval-requested', {
          visitorId: req.params.id,
        });

      res.json({
        ok: true,
        status: 'AWAITING_APPROVAL',
      });
    } catch (e) {
      next(e);
    }
  },
);

r.post(
  '/gate/:id/confirm-entry',
  allow('SECURITY'),
  async (req, res, next) => {
    try {
      const c = await pool.connect();

      try {
        await c.query('BEGIN');

        const q = await c.query(
          `
            UPDATE visitors
            SET
              status = 'INSIDE',
              entry_at = now(),
              entry_guard_id = $1
            WHERE id = $2
              AND estate_id = $3
              AND status = 'APPROVED'
            RETURNING resident_id
          `,
          [
            req.auth!.sub,
            req.params.id,
            req.auth!.estateId,
          ],
        );

        if (!q.rowCount) {
          await c.query('ROLLBACK');

          return res.status(409).json({
            error: 'Resident approval is required',
          });
        }

        await c.query(
          `
            UPDATE access_tokens
            SET used_at = now()
            WHERE visitor_id = $1
              AND token_type = 'ENTRY'
              AND used_at IS NULL
          `,
          [req.params.id],
        );

        await c.query('COMMIT');

        await audit(
          req.auth!.estateId,
          req.auth!.sub,
          'ENTRY_CONFIRMED',
          req.params.id,
        );

        await notifyUser(
          q.rows[0].resident_id,
          'Visitor entered',
          'Your visitor has entered the estate.',
          {
            visitorId: req.params.id,
          },
        );

        req.app
          .get('io')
          .to(req.auth!.estateId)
          .emit('visitor:entered', {
            visitorId: req.params.id,
          });

        res.json({
          ok: true,
          status: 'INSIDE',
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
  },
);

r.post('/gate/exit/lookup', allow('SECURITY'), async (req, res, next) => {
  try {
    const p = z.object({
      token: z.string().min(20),
    }).parse(req.body);

    const q = await pool.query(
      `
        SELECT
          v.id,
          v.full_name,
          v.phone,
          v.purpose,
          v.entry_at,
          v.status,
          u.full_name resident_name,
          u.phone resident_phone,
          h.house_number
        FROM access_tokens t
        JOIN visitors v
          ON v.id = t.visitor_id
        JOIN users u
          ON u.id = v.resident_id
        JOIN houses h
          ON h.id = v.house_id
        WHERE t.token_hash = $1
          AND t.token_type = 'EXIT'
          AND t.used_at IS NULL
          AND t.expires_at > now()
          AND v.estate_id = $2
          AND v.status = 'EXIT_REQUESTED'
      `,
      [
        tokenHash(p.token),
        req.auth!.estateId,
      ],
    );

    if (!q.rowCount) {
      return res.status(404).json({
        error: 'Invalid, expired or already-used exit pass',
      });
    }

    res.json(q.rows[0]);
  } catch (e) {
    next(e);
  }
});

r.post(
  '/gate/:id/confirm-exit',
  allow('SECURITY'),
  async (req, res, next) => {
    try {
      const p = z.object({
        residentPhoneCalled: z.literal(true),
        callOutcome: z.string().min(2).max(200),
      }).parse(req.body);

      const c = await pool.connect();

      try {
        await c.query('BEGIN');

        const q = await c.query(
          `
            UPDATE visitors
            SET
              status = 'EXITED',
              exit_at = now(),
              exit_guard_id = $1
            WHERE id = $2
              AND estate_id = $3
              AND status = 'EXIT_REQUESTED'
            RETURNING resident_id
          `,
          [
            req.auth!.sub,
            req.params.id,
            req.auth!.estateId,
          ],
        );

        if (!q.rowCount) {
          await c.query('ROLLBACK');

          return res.status(409).json({
            error: 'Visit is not awaiting exit verification',
          });
        }

        await c.query(
          `
            UPDATE access_tokens
            SET used_at = now()
            WHERE visitor_id = $1
              AND token_type = 'EXIT'
              AND used_at IS NULL
          `,
          [req.params.id],
        );

        await c.query(
          `
            INSERT INTO exit_verifications (
              visitor_id,
              guard_id,
              resident_phone_called,
              confirmed_at,
              notes
            )
            VALUES ($1, $2, true, now(), $3)
          `,
          [
            req.params.id,
            req.auth!.sub,
            p.callOutcome,
          ],
        );

        await c.query('COMMIT');

        await audit(
          req.auth!.estateId,
          req.auth!.sub,
          'EXIT_CONFIRMED',
          req.params.id,
          {
            callOutcome: p.callOutcome,
          },
        );

        await notifyUser(
          q.rows[0].resident_id,
          'Visitor exited',
          'Your visitor has successfully exited the estate.',
          {
            visitorId: req.params.id,
          },
        );

        req.app
          .get('io')
          .to(req.auth!.estateId)
          .emit('visitor:exited', {
            visitorId: req.params.id,
          });

        res.json({
          ok: true,
          status: 'EXITED',
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
  },
);

r.get('/gate/inside', allow('SECURITY'), async (req, res, next) => {
  try {
    const q = await pool.query(
      `
        SELECT
          v.id,
          v.full_name,
          v.phone,
          v.purpose,
          v.entry_at,
          u.full_name resident_name,
          h.house_number
        FROM visitors v
        JOIN users u
          ON u.id = v.resident_id
        JOIN houses h
          ON h.id = v.house_id
        WHERE v.estate_id = $1
          AND v.status = 'INSIDE'
        ORDER BY v.entry_at
      `,
      [req.auth!.estateId],
    );

    res.json(q.rows);
  } catch (e) {
    next(e);
  }
});

export default r;