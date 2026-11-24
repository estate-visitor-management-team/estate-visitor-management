# Visitor lifecycle and acceptance criteria

## Entry
1. Resident creates visitor record; house is derived from authenticated resident-house relationship, not accepted from client input.
2. Server creates a random entry secret, stores only its hash and expiry, and returns a QR payload to the resident.
3. Resident shares the invitation with visitor.
4. Guard scans/types token; server checks estate, expiry, unused state and visitor state.
5. Gate shows visitor + minimum host information to authenticated guard.
6. Guard requests permission; resident receives push notification.
7. Resident accepts/rejects. The server records the decision and emits a realtime update.
8. Guard confirms identity and confirms entry; server atomically consumes token, records guard and timestamp, and sets INSIDE.

## Exit
1. Resident selects an INSIDE visitor and requests checkout.
2. Server issues a different exit secret; the entry secret cannot be reused.
3. Guard validates exit token and sees visitor, visit and host details.
4. Guard calls resident using registered number and records that call verification was performed.
5. Guard confirms sign-out; server consumes exit token, records guard/time and sets EXITED.
6. Resident receives departure notification. Visit is already in history; DONE only acknowledges.
7. On acknowledgement, set COMPLETED or retain EXITED plus acknowledged_at. Do not make history depend on resident pressing DONE.

## Security decisions
- QR codes should contain opaque random secrets or signed references, not personal details.
- Do not reveal a resident's phone number to a visitor or unauthenticated user.
- Avoid showing more resident information than a guard needs for the current gate task.
- A call checkbox alone cannot prove the call happened; log guard, timestamp and optional call outcome.
- Add senior-officer emergency exit override with mandatory reason and audit event.
- Define token TTL, overstay threshold, data retention and blocked-list appeal policy with estate management.
- Offline gate mode must fail safely: never treat an unverified cached token as permission to enter.
