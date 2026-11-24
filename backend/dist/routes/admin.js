"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const security_1 = require("../security");
const audit_1 = require("../services/audit");
const r = (0, express_1.Router)();
r.use(auth_1.authenticate, (0, auth_1.allow)('ADMIN'));
r.post('/users', async (req, res, next) => {
    try {
        const p = zod_1.z.object({
            role: zod_1.z.enum(['RESIDENT', 'SECURITY']),
            fullName: zod_1.z.string().min(2),
            username: zod_1.z.string().min(3),
            phone: zod_1.z.string().min(7),
            houseId: zod_1.z.string().uuid().optional(),
            staffId: zod_1.z.string().optional(),
            temporaryPassword: zod_1.z.string().min(12),
        }).parse(req.body);
        if (p.role === 'RESIDENT' && !p.houseId) {
            return res.status(400).json({
                error: 'Resident must be assigned to a house',
            });
        }
        const c = await db_1.pool.connect();
        try {
            await c.query('BEGIN');
            const q = await c.query(`
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
        `, [
                req.auth.estateId,
                p.role,
                p.fullName,
                p.username,
                p.phone,
                await (0, security_1.hashPassword)(p.temporaryPassword),
                p.role === 'SECURITY' ? p.staffId : null,
            ]);
            if (p.houseId) {
                await c.query(`
            INSERT INTO resident_houses (
              resident_id,
              house_id,
              is_primary
            )
            VALUES ($1, $2, true)
          `, [
                    q.rows[0].id,
                    p.houseId,
                ]);
            }
            await c.query('COMMIT');
            await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'ACCOUNT_CREATED', null, {
                userId: q.rows[0].id,
                role: p.role,
            });
            res.status(201).json({
                id: q.rows[0].id,
                mustChangePassword: true,
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
r.get('/houses', async (req, res, next) => {
    try {
        const q = await db_1.pool.query(`
        SELECT id, house_number
        FROM houses
        WHERE estate_id = $1
          AND active = true
        ORDER BY house_number
      `, [req.auth.estateId]);
        res.json(q.rows);
    }
    catch (e) {
        next(e);
    }
});
r.get('/users', async (req, res, next) => {
    try {
        const q = await db_1.pool.query(`
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
      `, [req.auth.estateId]);
        res.json(q.rows);
    }
    catch (e) {
        next(e);
    }
});
r.patch('/users/:id/status', async (req, res, next) => {
    try {
        const p = zod_1.z.object({
            active: zod_1.z.boolean(),
        }).parse(req.body);
        await db_1.pool.query(`
        UPDATE users
        SET active = $1
        WHERE id = $2
          AND estate_id = $3
      `, [
            p.active,
            req.params.id,
            req.auth.estateId,
        ]);
        await (0, audit_1.audit)(req.auth.estateId, req.auth.sub, 'ACCOUNT_STATUS_CHANGED', null, {
            userId: req.params.id,
            active: p.active,
        });
        res.json({
            ok: true,
        });
    }
    catch (e) {
        next(e);
    }
});
exports.default = r;
