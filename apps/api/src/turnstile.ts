/*
Purpose: server-side Cloudflare Turnstile verification for sensitive endpoints.
Layer: backend (api)
Behavior: inert unless TURNSTILE_SECRET_KEY is set, so the feature is a no-op
until the operator configures the secret. The public site key is exposed
separately via the auth-mode public config.
*/

import { BadRequestException, Logger } from "@nestjs/common";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const logger = new Logger("Turnstile");

export const isTurnstileEnabled = (): boolean =>
  Boolean(process.env.TURNSTILE_SECRET_KEY && process.env.TURNSTILE_SECRET_KEY.trim());

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

/**
 * Verify a Turnstile token against Cloudflare. Returns true when the feature is
 * disabled (no secret configured) so callers stay functional out of the box.
 */
export const verifyTurnstileToken = async (
  token: string | undefined,
  remoteIp?: string
): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return true; // feature disabled — no-op
  }

  if (!token || !token.trim()) {
    return false;
  }

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) {
    form.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString()
    });

    if (!response.ok) {
      logger.warn(`Turnstile siteverify returned HTTP ${response.status}`);
      return false;
    }

    const data = (await response.json()) as TurnstileVerifyResponse;
    if (!data.success) {
      logger.warn(`Turnstile verification failed: ${(data["error-codes"] || []).join(", ")}`);
    }
    return data.success === true;
  } catch (error) {
    logger.warn(
      `Turnstile siteverify request error: ${error instanceof Error ? error.message : "unknown"}`
    );
    return false;
  }
};

/**
 * Throw a 400 with a stable code when the supplied token fails verification.
 * No-op when Turnstile is disabled.
 */
export const assertTurnstile = async (
  token: string | undefined,
  remoteIp?: string
): Promise<void> => {
  const ok = await verifyTurnstileToken(token, remoteIp);
  if (!ok) {
    throw new BadRequestException({
      code: "TURNSTILE_FAILED",
      message: "Verification failed. Please complete the challenge and try again.",
      reason: "Turnstile token missing or invalid.",
      fieldErrors: {}
    });
  }
};
