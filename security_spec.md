# Security Specification for Astra.ai

## Data Invariants
- A user profile can only be created by the authenticated user with matching UID.
- An analysis must belong to a valid user.
- Users can only read and write their own analyses.
- The `plan` field in User profile can only be modified by admins (simulated for now, or just restrictive).
- `createdAt` is immutable.
- `videoId` must be a valid YouTube ID format.

## The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Identity Spoofing**: Create a user profile with a different UID.
2. **Analysis Hijacking**: Create an analysis for another user's ID.
3. **Admin Field Escalation**: Update own `plan` to 'premium'.
4. **Shadow Field Injection**: Add a `superUser: true` field to a user document.
5. **ID Poisoning**: Use a 10KB string as a `videoId`.
6. **Malicious Transcript**: Inject a 2MB string into `summary` (exceeding Firestore limits or logic-based limits).
7. **Relational Sync Break**: Create an analysis for a `userId` that doesn't exist in `/users`.
8. **PII Leak**: Authenticated User A tries to `get` User B's email.
9. **Blanket List Query**: Request `getDocs(collection(db, 'users'))` without filters.
10. **State Shortcut**: Try to update `createdAt` after creation.
11. **Spoofed Email**: Authenticated but unverified email trying to write data.
12. **Orphaned Writes**: Create an analysis but forget to include required fields like `title`.

## Firestore Rules Pattern
- Use `isValidId` for all IDs.
- Use `isValidUser` and `isValidAnalysis` helpers.
- Use `affectedKeys().hasOnly()` for updates.
- Protect User PII.
