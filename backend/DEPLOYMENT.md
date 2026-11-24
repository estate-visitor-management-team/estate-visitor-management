# Production deployment runbook (must be completed before gate use)

## Infrastructure
- PostgreSQL 16+ on a managed private network; daily encrypted backups and point-in-time recovery.
- API behind HTTPS/TLS reverse proxy and WAF; never expose PostgreSQL publicly.
- Deploy API as a non-root container/process with health checks and restart policy.
- Store secrets in the hosting provider's secret manager, not in Git or the mobile bundle.
- Configure monitoring, error alerts, uptime checks, log retention and incident response.
- Set exact CORS origins; the Expo native app does not need wildcard browser CORS.
- Configure `EXPO_ACCESS_TOKEN` and register each user's Expo push token after login.
- For production app distribution, configure EAS project, Android package/signing, privacy policy and Play Console.

## Initial database and administrator
1. Create a dedicated PostgreSQL database/user with least privilege.
2. Copy `.env.example` to `.env` and set strong unique secrets.
3. Apply the initial migration: `npm run db:migrate`.
4. Set bootstrap administrator values securely, then run `npm run admin:create`.
5. Remove the bootstrap password from the deployment environment after creation.
6. Create houses, then create resident and security accounts from the admin API.
7. Require each provisioned user to change their temporary password before normal use.

## Mobile app
1. Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS API base ending in `/api`.
2. Build a signed Android app with EAS Build; do not distribute Expo Go for production.
3. Test notification permissions and push delivery on physical Android devices.
4. Validate QR scanning under low light, damaged screens, camera permission denial and no network.
5. Never permit an offline token scan to authorize access. Fail closed and call estate escalation procedure.

## Go-live acceptance tests
- Resident cannot read another house's visitor data.
- Guard cannot approve or reject a resident's request.
- Visitor cannot enter without resident acceptance and guard confirmation.
- Concurrent/replayed entry token attempts result in exactly one successful transition.
- Entry token cannot be used for exit; exit token cannot be used for entry.
- Exit is not completed without a recorded resident phone verification.
- Inactive users and expired sessions are denied.
- All state changes identify actor and timestamp in audit events.
- Notification failure does not roll back or falsify database state.
- Restore a database backup and verify recovery procedure.
- Penetration test API authorization, rate limits, token leakage and sensitive-data exposure.

**Do not connect this system to a live estate gate until the complete mobile screens are wired to these API routes, independent security review is complete, and the above tests pass.**
