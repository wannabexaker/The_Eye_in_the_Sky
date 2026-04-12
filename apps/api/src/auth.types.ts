export type CurrentAuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: "player" | "admin";
  sessionId: string;
};

export type RequestWithAuth = {
  headers?: Record<string, string | string[] | undefined>;
  authUser?: CurrentAuthUser;
  ip?: string;
  socket?: { remoteAddress?: string };
  secure?: boolean;
};

/**
 * Auth mode determines which authentication methods are available.
 */
export enum AuthMode {
  INTERNAL_ONLY = "INTERNAL_ONLY",
  EXTERNAL_ONLY = "EXTERNAL_ONLY",
  HYBRID = "HYBRID",
}

/**
 * Platform exchange request from external launcher or client.
 */
export interface PlatformExchangeRequest {
  platformAssertion: string;
  nonce: string;
  timestamp: number;
  handoffId?: string;
}

/**
 * Platform exchange response with authenticated user and session.
 */
export interface PlatformExchangeResponse {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  sessionId: string;
  sessionToken: string;
  expiresAt: number;
  authSource: "external";
}

/**
 * Auth mode configuration model.
 */
export interface AuthModeConfig {
  mode: AuthMode;
  platformIssuer?: string;
  platformAudience?: string;
  jwksUrl?: string;
  introspectionUrl?: string;
  allowedClockSkewSec: number;
  fallbackEnabled: boolean;
  mockModeEnabled: boolean;
  nonceTtlSec: number;
}

/**
 * External identity mapping to game user.
 */
export interface ExternalIdentityModel {
  id: string;
  userId: string;
  providerKey: string;
  externalUserId: string;
  externalUsername?: string;
  metadataJson?: string;
  createdAt: Date;
  updatedAt: Date;
}
