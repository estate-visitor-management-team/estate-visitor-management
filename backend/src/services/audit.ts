import { pool } from '../db';

export async function audit(
  estateId: string,
  actor: string | null,
  action: string,
  visitorId: string | null = null,
  metadata: Record<string, unknown> = {},
) {
  await pool.query(
    `
      INSERT INTO audit_events (
        estate_id,
        actor_user_id,
        visitor_id,
        action,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      estateId,
      actor,
      visitorId,
      action,
      JSON.stringify(metadata),
    ],
  );
}