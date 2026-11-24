"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.allow = allow;
const security_1 = require("../security");
const db_1 = require("../db");
async function authenticate(req, res, next) {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
        });
    }
    let claims;
    try {
        claims = (0, security_1.verifyAccess)(authorization.slice(7));
    }
    catch {
        return res.status(401).json({
            error: 'Session expired or invalid',
        });
    }
    try {
        const session = await db_1.pool.query(`
        SELECT rs.id
        FROM refresh_sessions rs
        INNER JOIN users u
          ON u.id = rs.user_id
        WHERE rs.id = $1
          AND rs.user_id = $2
          AND rs.revoked_at IS NULL
          AND rs.expires_at > NOW()
          AND u.active = TRUE
          AND u.estate_id = $3
          AND u.role = $4
        LIMIT 1
      `, [
            claims.sid,
            claims.sub,
            claims.estateId,
            claims.role,
        ]);
        if (session.rowCount === 0) {
            return res.status(401).json({
                error: 'Session has expired or been revoked',
            });
        }
        req.auth = claims;
        return next();
    }
    catch (error) {
        return next(error);
    }
}
function allow(...roles) {
    return (req, res, next) => {
        if (!req.auth || !roles.includes(req.auth.role)) {
            return res.status(403).json({
                error: 'Insufficient permission',
            });
        }
        return next();
    };
}
