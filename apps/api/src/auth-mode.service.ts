import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { AuthMode, AuthModeConfig } from "./auth.types";

/**
 * AppSetting keys for auth mode configuration.
 */
const AUTH_MODE_KEY = "auth:mode";
const AUTH_PLATFORM_ISSUER_KEY = "auth:platform:issuer";
const AUTH_PLATFORM_AUDIENCE_KEY = "auth:platform:audience";
const AUTH_JWKS_URL_KEY = "auth:platform:jwksUrl";
const AUTH_INTROSPECTION_URL_KEY = "auth:platform:introspectionUrl";
const AUTH_ALLOWED_CLOCK_SKEW_KEY = "auth:platform:allowedClockSkewSec";
const AUTH_FALLBACK_ENABLED_KEY = "auth:platform:fallbackEnabled";
const AUTH_MOCK_MODE_ENABLED_KEY = "auth:platform:mockModeEnabled";
const AUTH_NONCE_TTL_KEY = "auth:platform:nonceTtlSec";

@Injectable()
export class AuthModeService {
  private readonly logger = new Logger(AuthModeService.name);
  private configCache: AuthModeConfig | null = null;
  private cacheExpiry = 0;
  private readonly cacheTtlMs = 60000; // 60s cache

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current auth mode configuration.
   */
  async getConfig(): Promise<AuthModeConfig> {
    if (this.configCache && Date.now() < this.cacheExpiry) {
      return this.configCache;
    }

    const settings = await this.prisma.appSetting.findMany({
      where: {
        key: {
          in: [
            AUTH_MODE_KEY,
            AUTH_PLATFORM_ISSUER_KEY,
            AUTH_PLATFORM_AUDIENCE_KEY,
            AUTH_JWKS_URL_KEY,
            AUTH_INTROSPECTION_URL_KEY,
            AUTH_ALLOWED_CLOCK_SKEW_KEY,
            AUTH_FALLBACK_ENABLED_KEY,
            AUTH_MOCK_MODE_ENABLED_KEY,
            AUTH_NONCE_TTL_KEY
          ]
        }
      }
    });

    const settingMap = new Map(settings.map((s) => [s.key, s.value]));

    this.configCache = {
      mode: (settingMap.get(AUTH_MODE_KEY) as AuthMode) || AuthMode.INTERNAL_ONLY,
      platformIssuer: settingMap.get(AUTH_PLATFORM_ISSUER_KEY),
      platformAudience: settingMap.get(AUTH_PLATFORM_AUDIENCE_KEY),
      jwksUrl: settingMap.get(AUTH_JWKS_URL_KEY),
      introspectionUrl: settingMap.get(AUTH_INTROSPECTION_URL_KEY),
      allowedClockSkewSec: parseInt(settingMap.get(AUTH_ALLOWED_CLOCK_SKEW_KEY) || "0", 10),
      fallbackEnabled: (settingMap.get(AUTH_FALLBACK_ENABLED_KEY) || "false") === "true",
      mockModeEnabled: (settingMap.get(AUTH_MOCK_MODE_ENABLED_KEY) || "false") === "true",
      nonceTtlSec: parseInt(settingMap.get(AUTH_NONCE_TTL_KEY) || "300", 10) // 5 min default
    };

    this.cacheExpiry = Date.now() + this.cacheTtlMs;
    return this.configCache;
  }

  /**
   * Get current auth mode only.
   */
  async getMode(): Promise<AuthMode> {
    const config = await this.getConfig();
    return config.mode;
  }

  /**
   * Update auth mode configuration.
   */
  async updateConfig(
    updates: Partial<AuthModeConfig>,
    actorUserId?: string
  ): Promise<AuthModeConfig> {
    const updates_obj: Record<string, string> = {};

    if (updates.mode !== undefined) {
      updates_obj[AUTH_MODE_KEY] = updates.mode;
    }
    if (updates.platformIssuer !== undefined) {
      updates_obj[AUTH_PLATFORM_ISSUER_KEY] = updates.platformIssuer || "";
    }
    if (updates.platformAudience !== undefined) {
      updates_obj[AUTH_PLATFORM_AUDIENCE_KEY] = updates.platformAudience || "";
    }
    if (updates.jwksUrl !== undefined) {
      updates_obj[AUTH_JWKS_URL_KEY] = updates.jwksUrl || "";
    }
    if (updates.introspectionUrl !== undefined) {
      updates_obj[AUTH_INTROSPECTION_URL_KEY] = updates.introspectionUrl || "";
    }
    if (updates.allowedClockSkewSec !== undefined) {
      updates_obj[AUTH_ALLOWED_CLOCK_SKEW_KEY] = String(updates.allowedClockSkewSec);
    }
    if (updates.fallbackEnabled !== undefined) {
      updates_obj[AUTH_FALLBACK_ENABLED_KEY] = updates.fallbackEnabled ? "true" : "false";
    }
    if (updates.mockModeEnabled !== undefined) {
      updates_obj[AUTH_MOCK_MODE_ENABLED_KEY] = updates.mockModeEnabled ? "true" : "false";
    }
    if (updates.nonceTtlSec !== undefined) {
      updates_obj[AUTH_NONCE_TTL_KEY] = String(updates.nonceTtlSec);
    }

    // Upsert all settings
    for (const [key, value] of Object.entries(updates_obj)) {
      await this.prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    }

    // Audit trail
    if (actorUserId) {
      await this.prisma.adminAction.create({
        data: {
          userId: actorUserId,
          actionType: "auth.config_update",
          payload: JSON.stringify(updates)
        }
      });

      await this.prisma.auditLog.create({
        data: {
          entityType: "auth:config",
          entityId: "auth_mode",
          eventType: "config_update",
          payload: JSON.stringify({ updates, actorUserId })
        }
      });
    }

    // Invalidate cache
    this.configCache = null;
    this.cacheExpiry = 0;

    return this.getConfig();
  }

  /**
   * Check if external auth is allowed in current mode.
   */
  async isExternalAuthAllowed(): Promise<boolean> {
    const mode = await this.getMode();
    return mode === AuthMode.EXTERNAL_ONLY || mode === AuthMode.HYBRID;
  }

  /**
   * Check if internal auth is allowed in current mode.
   */
  async isInternalAuthAllowed(): Promise<boolean> {
    const mode = await this.getMode();
    return mode === AuthMode.INTERNAL_ONLY || mode === AuthMode.HYBRID;
  }

  /**
   * Get sanitized config for public API response (excludes secrets).
   */
  async getPublicConfig(): Promise<Omit<AuthModeConfig, "jwksUrl" | "introspectionUrl">> {
    const config = await this.getConfig();
    const { jwksUrl: _, introspectionUrl: __, ...publicConfig } = config;
    return publicConfig;
  }
}
