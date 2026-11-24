"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audit = audit;
const db_1 = require("../db");
async function audit(estateId, actor, action, visitorId = null, metadata = {}) {
    await db_1.pool.query(`
      INSERT INTO audit_events (
        estate_id,
        actor_user_id,
        visitor_id,
        action,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5)
    `, [
        estateId,
        actor,
        visitorId,
        action,
        JSON.stringify(metadata),
    ]);
}
