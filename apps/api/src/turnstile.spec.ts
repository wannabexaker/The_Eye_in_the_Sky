/**
 * Turnstile Server-Side Verification — Unit Tests
 *
 * Exercises the no-op-when-unconfigured contract, the siteverify call shape,
 * and every failure branch (missing token, HTTP error, success:false, network
 * error) with a mocked global fetch. No real Cloudflare traffic.
 */

import { BadRequestException } from "@nestjs/common";
import { assertTurnstile, isTurnstileEnabled, verifyTurnstileToken } from "./turnstile";

const originalSecret = process.env.TURNSTILE_SECRET_KEY;
const originalFetch = global.fetch;

const mockFetchResponse = (body: unknown, ok = true, status = 200) =>
  jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body)
  });

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
  } else {
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
  }
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("isTurnstileEnabled", () => {
  it("is false when the secret is unset or blank", () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    expect(isTurnstileEnabled()).toBe(false);
    process.env.TURNSTILE_SECRET_KEY = "   ";
    expect(isTurnstileEnabled()).toBe(false);
  });

  it("is true when a secret is configured", () => {
    process.env.TURNSTILE_SECRET_KEY = "0x4AAAAAADpmy-secret";
    expect(isTurnstileEnabled()).toBe(true);
  });
});

describe("verifyTurnstileToken", () => {
  it("returns true without calling Cloudflare when disabled (no-op contract)", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as never;

    await expect(verifyTurnstileToken(undefined)).resolves.toBe(true);
    await expect(verifyTurnstileToken("any-token")).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a missing or blank token without calling Cloudflare", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-1";
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as never;

    await expect(verifyTurnstileToken(undefined)).resolves.toBe(false);
    await expect(verifyTurnstileToken("")).resolves.toBe(false);
    await expect(verifyTurnstileToken("   ")).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs secret, response and remoteip as form data to siteverify", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-1";
    const fetchSpy = mockFetchResponse({ success: true });
    global.fetch = fetchSpy as never;

    await expect(verifyTurnstileToken("token-abc", "203.0.113.7")).resolves.toBe(true);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.method).toBe("POST");
    const form = new URLSearchParams(String(init.body));
    expect(form.get("secret")).toBe("secret-1");
    expect(form.get("response")).toBe("token-abc");
    expect(form.get("remoteip")).toBe("203.0.113.7");
  });

  it("omits remoteip when not provided", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-1";
    const fetchSpy = mockFetchResponse({ success: true });
    global.fetch = fetchSpy as never;

    await verifyTurnstileToken("token-abc");
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(new URLSearchParams(String(init.body)).has("remoteip")).toBe(false);
  });

  it("returns false when Cloudflare reports success:false", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-1";
    global.fetch = mockFetchResponse({
      success: false,
      "error-codes": ["invalid-input-secret"]
    }) as never;

    await expect(verifyTurnstileToken("token-abc")).resolves.toBe(false);
  });

  it("returns false on a non-2xx siteverify response", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-1";
    global.fetch = mockFetchResponse({}, false, 503) as never;

    await expect(verifyTurnstileToken("token-abc")).resolves.toBe(false);
  });

  it("returns false when the siteverify request throws (fail closed)", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-1";
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as never;

    await expect(verifyTurnstileToken("token-abc")).resolves.toBe(false);
  });
});

describe("assertTurnstile", () => {
  it("resolves silently when verification passes", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-1";
    global.fetch = mockFetchResponse({ success: true }) as never;

    await expect(assertTurnstile("token-abc")).resolves.toBeUndefined();
  });

  it("resolves silently when the feature is disabled", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    await expect(assertTurnstile(undefined)).resolves.toBeUndefined();
  });

  it("throws 400 TURNSTILE_FAILED with a stable error shape on failure", async () => {
    process.env.TURNSTILE_SECRET_KEY = "secret-1";
    global.fetch = mockFetchResponse({ success: false, "error-codes": ["timeout-or-duplicate"] }) as never;

    try {
      await assertTurnstile("stale-token");
      throw new Error("expected assertTurnstile to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as Record<string, unknown>;
      expect(response.code).toBe("TURNSTILE_FAILED");
      expect(response.fieldErrors).toEqual({});
    }
  });
});
