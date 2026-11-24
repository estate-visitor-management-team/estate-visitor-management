# Backend implementation guide

Recommended production stack: Node.js + Express + TypeScript + PostgreSQL + Prisma (or SQL migrations), Argon2id password hashing, short-lived access tokens + rotating refresh tokens, Firebase Cloud Messaging, and Socket.IO.

Do not expose database credentials or privileged API keys in the Expo app. The app must call this API over HTTPS.

## Required API contract
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`
- POST `/auth/change-password`
- POST `/admin/users` (admin only; provision residents/security)
- PATCH `/admin/users/:id/status`
- GET/POST `/residents/me/visitors`
- GET `/visitors/:id`
- POST `/visitors/:id/entry-token` (server-generated)
- POST `/gate/entry/lookup`
- POST `/gate/entry/:id/request-permission`
- POST `/visitors/:id/decision` (resident accept/reject)
- POST `/gate/entry/:id/confirm`
- POST `/visitors/:id/exit-token` (server-generated, only if INSIDE)
- POST `/gate/exit/lookup`
- POST `/gate/exit/:id/confirm` (requires guard call-confirmation attestation)
- POST `/visitors/:id/acknowledge`
- GET `/visitors?status=&from=&to=&house=`
- GET `/admin/reports/visitors`
- GET `/admin/audit-events`

## Required backend invariants
1. Every query is scoped to the authenticated estate and role.
2. Residents can only view/manage visits for their linked house(s).
3. Only resident-linked authorization can approve or reject entry.
4. Guard confirms entry only after an APPROVED state.
5. Exit token is separate from entry token, one-time, short-lived and hashed at rest.
6. Exit confirmation only from EXIT_REQUESTED; record guard identity, timestamp and call-confirmation flag.
7. Every state change occurs in a database transaction and writes an append-only audit event.
8. Prevent duplicate entry, token replay and concurrent state transitions with database constraints/row locks.
9. Management cannot silently alter visit history; corrections create an audited amendment event.
10. Push notification delivery is best-effort; database state is authoritative.
