# Security Specification (Phase 0 TDD) — EMPLEO 10

## 1. Data Invariants

1. **Single-Owner Private Workspace Isolation (`/workspaces/{userId}`)**:
   - Only an authenticated user with `request.auth != null`, `request.auth.uid == userId`, `request.auth.token.email_verified == true`, and `request.auth.token.email == 'pilarfernandezalmaraz81@gmail.com'` can read (`get`), create, update, or delete `/workspaces/{userId}`.
   - No `list` operation is permitted on `/workspaces` to prevent enumeration.
   - `ownerId` must match `request.auth.uid` and remain immutable across updates.
   - `updatedAt` must equal `request.time`.

2. **Public Share Snapshot Isolation (`/public_shares/{token}`)**:
   - Write operations (`create`, `update`, `delete`) are strictly restricted to the verified owner (`pilarfernandezalmaraz81@gmail.com`) where `incoming().ownerId == request.auth.uid`.
   - Single-document `get` is allowed when `isValidId(token)` and (`resource.data.isActive == true` or the requester is the verified owner).
   - `list` is restricted strictly to the verified owner where `resource.data.ownerId == request.auth.uid`. Anonymous or third-party users can NEVER list `/public_shares`.

## 2. The "Dirty Dozen" Payloads

1. **Anonymous Read on Private Workspace**: Unauthenticated `get` on `/workspaces/user_123` -> `PERMISSION_DENIED`.
2. **Non-Owner Authenticated Read on Private Workspace**: Authenticated user `attacker@gmail.com` attempts `get` on `/workspaces/owner_uid` -> `PERMISSION_DENIED`.
3. **Unverified Email Spoof on Private Workspace**: Token with `email == 'pilarfernandezalmaraz81@gmail.com'` but `email_verified == false` attempts `create` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on Workspace Create**: Payload includes extra key `isAdmin: true` not in `hasOnly` allowlist -> `PERMISSION_DENIED`.
5. **Identity Spoofing on Workspace Create**: `incoming().ownerId != request.auth.uid` -> `PERMISSION_DENIED`.
6. **Immutable Field Mutation on Workspace Update**: Changing `ownerId` during `update` -> `PERMISSION_DENIED`.
7. **Forged Client Timestamp**: `updatedAt` is a client timestamp rather than `request.time` -> `PERMISSION_DENIED`.
8. **Denial-of-Wallet Oversized String**: `payloadJson.size() > 900000` -> `PERMISSION_DENIED`.
9. **ID Poisoning on Path Variable**: `token` with invalid characters or length > 128 -> `PERMISSION_DENIED`.
10. **Unauthorized Public Share Listing**: Anonymous or third-party user attempts `list` on `/public_shares` -> `PERMISSION_DENIED`.
11. **Reading Revoked Public Share**: Anonymous user attempts `get` on `/public_shares/tok_1` where `isActive == false` -> `PERMISSION_DENIED`.
12. **Unauthorized Public Share Creation**: Non-owner attempts `create` on `/public_shares/tok_1` -> `PERMISSION_DENIED`.
