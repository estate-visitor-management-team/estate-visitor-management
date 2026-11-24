"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const security_1 = require("../security");
const audit_1 = require("../services/audit");
const notify_1 = require("../services/notify");
const qrcode_1 = __importDefault(require("qrcode"));
const r = (0, express_1.Router)();
r.use(auth_1.authenticate);
async function houseFor(residentId, estateId) {
    const q = await db_1.pool.query(`
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
    `, [
        residentId,
        estateId,
    ]);
    return q.rows[0];
}
r.post('/', (0, auth_1.allow)('RESIDENT'), async (req, res, next) => {
    try {
        const p = zod_1.z.object({
            fullName: zod_1.z.string().min(2),
            phone: zod_1.z.string().min(7),
            purpose: zod_1.z.string().min(2),
            expectedAt: zod_1.z.string().datetime(),
            additionalInfo: zod_1.z.string().max(500).optional(),
        }).parse(req.body);
        const h = await houseFor(req.auth.sub, req.auth.estateId);
        if (!h) {
            return res.status(400).json({
                error: 'No active house assigned',
            });
        }
        const token = (0, security_1.opaqueToken)();
        const expires = new Date(Date.now() + 24 * 3600000);
        const c = await db_1.pool.connect();
        try {
            await c.query('BEGIN');
            const q = await c.query(`
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
        `, [
                req.auth.estateId,
                req.auth.sub,
                h.id,
                p.fullName,
                p.phone,
                p.purpose,
                p.expectedAt,
                p.additionalInfo || null,
            ]);
            await c.query(`
          INSERT INTO access_tokens (
            visitor_id,
            token_hash,
            token_type,
            expires_at
          )
          VALUES ($1, $2, 'ENTRY', $3)
        `, [
                q.rows[0].id,
                (0, security_1.tokenHash)(token),
                expires,
            ]);
            await c.query('COMMIT');
            await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'VISITOR_PREREGISTERED', q.rows[0].id);
            res.status(201).json({
                visitorId: q.rows[0].id,
                entryToken: token,
                expiresAt: expires,
                qrDataUrl: await qrcode_1.default.toDataURL(token),
            });
        }
        catch (e) {
            await c.query('ROLLBACK');
            throw e;
        }
        finally {
            c.release();
        }
    }
    catch (e) {
        next(e);
    }
});
r.get('/mine', (0, auth_1.allow)('RESIDENT'), async (req, res, next) => {
    try {
        const q = await db_1.pool.query(`
        SELECT
          v.*,
          h.house_number
        FROM visitors v
        JOIN houses h
          ON h.id = v.house_id
        WHERE v.resident_id = $1
        ORDER BY v.created_at DESC
      `, [req.auth.sub]);
        res.json(q.rows);
    }
    catch (e) {
        next(e);
    }
});
r.post('/:id/decision', (0, auth_1.allow)('RESIDENT'), async (req, res, next) => {
    try {
        const p = zod_1.z.object({
            decision: zod_1.z.enum(['ACCEPTED', 'REJECTED']),
        }).parse(req.body);
        const c = await db_1.pool.connect();
        try {
            await c.query('BEGIN');
            const q = await c.query(`
          UPDATE visitors
          SET status = $1
          WHERE id = $2
            AND resident_id = $3
            AND status = 'AWAITING_APPROVAL'
          RETURNING id, estate_id
        `, [
                p.decision === 'ACCEPTED' ? 'APPROVED' : 'REJECTED',
                req.params.id,
                req.auth.sub,
            ]);
            if (!q.rowCount) {
                await c.query('ROLLBACK');
                return res.status(409).json({
                    error: 'Visit is not awaiting your decision',
                });
            }
            await c.query(`
          UPDATE approval_requests
          SET
            decision = $1,
            decided_by_resident_id = $2,
            decided_at = now()
          WHERE visitor_id = $3
            AND decision IS NULL
        `, [
                p.decision,
                req.auth.sub,
                req.params.id,
            ]);
            await c.query('COMMIT');
            await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'ENTRY_' + p.decision, req.params.id);
            res.json({
                ok: true,
                status: p.decision,
            });
        }
        catch (e) {
            await c.query('ROLLBACK');
            throw e;
        }
        finally {
            c.release();
        }
    }
    catch (e) {
        next(e);
    }
});
r.post('/:id/checkout', (0, auth_1.allow)('RESIDENT'), async (req, res, next) => {
    try {
        const token = (0, security_1.opaqueToken)();
        const c = await db_1.pool.connect();
        try {
            await c.query('BEGIN');
            const q = await c.query(`
          UPDATE visitors
          SET status = 'EXIT_REQUESTED'
          WHERE id = $1
            AND resident_id = $2
            AND status = 'INSIDE'
          RETURNING id
        `, [
                req.params.id,
                req.auth.sub,
            ]);
            if (!q.rowCount) {
                await c.query('ROLLBACK');
                return res.status(409).json({
                    error: 'Visitor is not currently inside',
                });
            }
            await c.query(`
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
        `, [
                req.params.id,
                (0, security_1.tokenHash)(token),
            ]);
            await c.query('COMMIT');
            await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'EXIT_REQUESTED', req.params.id);
            res.json({
                exitToken: token,
            });
        }
        catch (e) {
            await c.query('ROLLBACK');
            throw e;
        }
        finally {
            c.release();
        }
    }
    catch (e) {
        next(e);
    }
});
r.post('/:id/acknowledge', (0, auth_1.allow)('RESIDENT'), async (req, res, next) => {
    try {
        const q = await db_1.pool.query(`
        UPDATE visitors
        SET resident_acknowledged_at = now()
        WHERE id = $1
          AND resident_id = $2
          AND status = 'EXITED'
        RETURNING id
      `, [
            req.params.id,
            req.auth.sub,
        ]);
        if (!q.rowCount) {
            return res.status(409).json({
                error: 'Visit is not ready to acknowledge',
            });
        }
        await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'EXIT_ACKNOWLEDGED', req.params.id);
        res.json({
            ok: true,
        });
    }
    catch (e) {
        next(e);
    }
});
r.post('/gate/entry/lookup', (0, auth_1.allow)('SECURITY'), async (req, res, next) => {
    try {
        const p = zod_1.z.object({
            token: zod_1.z.string().min(20),
        }).parse(req.body);
        const q = await db_1.pool.query(`
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
      `, [
            (0, security_1.tokenHash)(p.token),
            req.auth.estateId,
        ]);
        if (!q.rowCount) {
            return res.status(404).json({
                error: 'Invalid, expired or already-used entry pass',
            });
        }
        res.json(q.rows[0]);
    }
    catch (e) {
        next(e);
    }
});
r.post('/gate/:id/request-permission', (0, auth_1.allow)('SECURITY'), async (req, res, next) => {
    try {
        const q = await db_1.pool.query(`
          UPDATE visitors
          SET status = 'AWAITING_APPROVAL'
          WHERE id = $1
            AND estate_id = $2
            AND status = 'EXPECTED'
          RETURNING resident_id
        `, [
            req.params.id,
            req.auth.estateId,
        ]);
        if (!q.rowCount) {
            return res.status(409).json({
                error: 'Visitor is not in EXPECTED state',
            });
        }
        await db_1.pool.query(`
          INSERT INTO approval_requests (
            visitor_id,
            requested_by_guard_id
          )
          VALUES ($1, $2)
        `, [
            req.params.id,
            req.auth.sub,
        ]);
        await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'ENTRY_PERMISSION_REQUESTED', req.params.id);
        await (0, notify_1.notifyUser)(q.rows[0].resident_id, 'Visitor at estate gate', 'A visitor is requesting entry.', {
            visitorId: req.params.id,
        });
        req.app
            .get('io')
            .to(req.auth.estateId)
            .emit('visitor:approval-requested', {
            visitorId: req.params.id,
        });
        res.json({
            ok: true,
            status: 'AWAITING_APPROVAL',
        });
    }
    catch (e) {
        next(e);
    }
});
r.post('/gate/:id/confirm-entry', (0, auth_1.allow)('SECURITY'), async (req, res, next) => {
    try {
        const c = await db_1.pool.connect();
        try {
            await c.query('BEGIN');
            const q = await c.query(`
            UPDATE visitors
            SET
              status = 'INSIDE',
              entry_at = now(),
              entry_guard_id = $1
            WHERE id = $2
              AND estate_id = $3
              AND status = 'APPROVED'
            RETURNING resident_id
          `, [
                req.auth.sub,
                req.params.id,
                req.auth.estateId,
            ]);
            if (!q.rowCount) {
                await c.query('ROLLBACK');
                return res.status(409).json({
                    error: 'Resident approval is required',
                });
            }
            await c.query(`
            UPDATE access_tokens
            SET used_at = now()
            WHERE visitor_id = $1
              AND token_type = 'ENTRY'
              AND used_at IS NULL
          `, [req.params.id]);
            await c.query('COMMIT');
            await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'ENTRY_CONFIRMED', req.params.id);
            await (0, notify_1.notifyUser)(q.rows[0].resident_id, 'Visitor entered', 'Your visitor has entered the estate.', {
                visitorId: req.params.id,
            });
            req.app
                .get('io')
                .to(req.auth.estateId)
                .emit('visitor:entered', {
                visitorId: req.params.id,
            });
            res.json({
                ok: true,
                status: 'INSIDE',
            });
        }
        catch (e) {
            await c.query('ROLLBACK');
            throw e;
        }
        finally {
            c.release();
        }
    }
    catch (e) {
        next(e);
    }
});
r.post('/gate/exit/lookup', (0, auth_1.allow)('SECURITY'), async (req, res, next) => {
    try {
        const p = zod_1.z.object({
            token: zod_1.z.string().min(20),
        }).parse(req.body);
        const q = await db_1.pool.query(`
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
      `, [
            (0, security_1.tokenHash)(p.token),
            req.auth.estateId,
        ]);
        if (!q.rowCount) {
            return res.status(404).json({
                error: 'Invalid, expired or already-used exit pass',
            });
        }
        res.json(q.rows[0]);
    }
    catch (e) {
        next(e);
    }
});
r.post('/gate/:id/confirm-exit', (0, auth_1.allow)('SECURITY'), async (req, res, next) => {
    try {
        const p = zod_1.z.object({
            residentPhoneCalled: zod_1.z.literal(true),
            callOutcome: zod_1.z.string().min(2).max(200),
        }).parse(req.body);
        const c = await db_1.pool.connect();
        try {
            await c.query('BEGIN');
            const q = await c.query(`
            UPDATE visitors
            SET
              status = 'EXITED',
              exit_at = now(),
              exit_guard_id = $1
            WHERE id = $2
              AND estate_id = $3
              AND status = 'EXIT_REQUESTED'
            RETURNING resident_id
          `, [
                req.auth.sub,
                req.params.id,
                req.auth.estateId,
            ]);
            if (!q.rowCount) {
                await c.query('ROLLBACK');
                return res.status(409).json({
                    error: 'Visit is not awaiting exit verification',
                });
            }
            await c.query(`
            UPDATE access_tokens
            SET used_at = now()
            WHERE visitor_id = $1
              AND token_type = 'EXIT'
              AND used_at IS NULL
          `, [req.params.id]);
            await c.query(`
            INSERT INTO exit_verifications (
              visitor_id,
              guard_id,
              resident_phone_called,
              confirmed_at,
              notes
            )
            VALUES ($1, $2, true, now(), $3)
          `, [
                req.params.id,
                req.auth.sub,
                p.callOutcome,
            ]);
            await c.query('COMMIT');
            await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'EXIT_CONFIRMED', req.params.id, {
                callOutcome: p.callOutcome,
            });
            await (0, notify_1.notifyUser)(q.rows[0].resident_id, 'Visitor exited', 'Your visitor has successfully exited the estate.', {
                visitorId: req.params.id,
            });
            req.app
                .get('io')
                .to(req.auth.estateId)
                .emit('visitor:exited', {
                visitorId: req.params.id,
            });
            res.json({
                ok: true,
                status: 'EXITED',
            });
        }
        catch (e) {
            await c.query('ROLLBACK');
            throw e;
        }
        finally {
            c.release();
        }
    }
    catch (e) {
        next(e);
    }
});
r.get('/gate/inside', (0, auth_1.allow)('SECURITY'), async (req, res, next) => {
    try {
        const q = await db_1.pool.query(`
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
      `, [req.auth.estateId]);
        res.json(q.rows);
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
