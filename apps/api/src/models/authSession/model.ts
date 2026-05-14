export type AuthSessionEntity = {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
};

export type CreateAuthSessionInput = {
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
};

/*
Future auth-session fields to consider when the starter needs deeper session
tracking:

- familyId: groups rotated refresh tokens so reuse can revoke a whole token
  family.
- replacedBySessionId: links an old revoked refresh session to its replacement
  during rotation.
- userAgent: records the client for session-management UI and audit logs.
- ipAddress: records the request origin for audit logs and suspicious-login
  checks.
*/
