import { BadRequestException } from "@nestjs/common";
import { validators, parseOrBadRequest } from "./game.validators";

// ─── authRegister ────────────────────────────────────────────────────────────

describe("validators.authRegister", () => {
  const valid = {
    email: "player@example.com",
    password: "SecurePass1!",
    displayName: "TestPlayer"
  };

  it("accepts valid input", () => {
    expect(validators.authRegister.safeParse(valid).success).toBe(true);
  });

  it("normalises email to lowercase", () => {
    const result = validators.authRegister.safeParse({
      ...valid,
      email: "PLAYER@EXAMPLE.COM"
    });
    expect(result.success && result.data.email).toBe("player@example.com");
  });

  it("rejects invalid email format", () => {
    expect(validators.authRegister.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects SQL injection in email", () => {
    expect(
      validators.authRegister.safeParse({ ...valid, email: "'; DROP TABLE users; --@x.com" }).success
    ).toBe(false);
  });

  it("rejects XSS payload in displayName", () => {
    expect(
      validators.authRegister.safeParse({ ...valid, displayName: "<script>alert(1)</script>" }).success
    ).toBe(false);
  });

  it("rejects HTML injection in displayName", () => {
    expect(
      validators.authRegister.safeParse({ ...valid, displayName: '<img src=x onerror=alert(1)>' }).success
    ).toBe(false);
  });

  it("rejects single-char displayName", () => {
    expect(validators.authRegister.safeParse({ ...valid, displayName: "A" }).success).toBe(false);
  });

  it("rejects displayName over 50 chars", () => {
    expect(
      validators.authRegister.safeParse({ ...valid, displayName: "A".repeat(51) }).success
    ).toBe(false);
  });

  it("rejects short password (< 8 chars)", () => {
    expect(validators.authRegister.safeParse({ ...valid, password: "1234567" }).success).toBe(false);
  });

  it("rejects password over 100 chars", () => {
    expect(
      validators.authRegister.safeParse({ ...valid, password: "x".repeat(101) }).success
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(validators.authRegister.safeParse({}).success).toBe(false);
  });
});

// ─── authLogin ───────────────────────────────────────────────────────────────

describe("validators.authLogin", () => {
  const valid = { email: "player@example.com", password: "anypassword" };

  it("accepts valid login", () => {
    expect(validators.authLogin.safeParse(valid).success).toBe(true);
  });

  it("rejects SQL injection in email", () => {
    expect(
      validators.authLogin.safeParse({ ...valid, email: "' OR '1'='1" }).success
    ).toBe(false);
  });

  it("rejects UNION SELECT injection", () => {
    expect(
      validators.authLogin.safeParse({ ...valid, email: "x' UNION SELECT * FROM users--@x.com" }).success
    ).toBe(false);
  });

  it("rejects empty password", () => {
    expect(validators.authLogin.safeParse({ ...valid, password: "" }).success).toBe(false);
  });
});

describe("validators.auth password flows", () => {
  it("accepts valid change password input", () => {
    expect(
      validators.authChangePassword.safeParse({
        currentPassword: "SecurePass1!",
        newPassword: "DifferentPass1!"
      }).success
    ).toBe(true);
  });

  it("rejects short new password in change password input", () => {
    expect(
      validators.authChangePassword.safeParse({
        currentPassword: "SecurePass1!",
        newPassword: "short"
      }).success
    ).toBe(false);
  });

  it("accepts valid forgot password email", () => {
    expect(validators.authForgotPassword.safeParse({ email: "PLAYER@EXAMPLE.COM" }).success).toBe(true);
  });

  it("accepts valid reset password token and new password", () => {
    expect(
      validators.authResetPassword.safeParse({
        token: "a".repeat(64),
        newPassword: "DifferentPass1!"
      }).success
    ).toBe(true);
  });

  it("rejects short reset password token", () => {
    expect(
      validators.authResetPassword.safeParse({
        token: "short",
        newPassword: "DifferentPass1!"
      }).success
    ).toBe(false);
  });
});

// ─── authModePatch ────────────────────────────────────────────────────────────

describe("validators.authModePatch", () => {
  it("accepts valid INTERNAL_ONLY mode", () => {
    expect(validators.authModePatch.safeParse({ mode: "INTERNAL_ONLY" }).success).toBe(true);
  });

  it("accepts HYBRID with valid fields", () => {
    const result = validators.authModePatch.safeParse({
      mode: "HYBRID",
      platformIssuer: "https://auth.example.com",
      platformAudience: "my-app",
      allowedClockSkewSec: 30,
      fallbackEnabled: true,
      nonceTtlSec: 300
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown mode", () => {
    expect(validators.authModePatch.safeParse({ mode: "OPEN" }).success).toBe(false);
  });

  it("rejects clockSkew out of range", () => {
    expect(validators.authModePatch.safeParse({ mode: "HYBRID", allowedClockSkewSec: 999 }).success).toBe(false);
  });

  it("rejects invalid URL for platformIssuer", () => {
    expect(
      validators.authModePatch.safeParse({ mode: "HYBRID", platformIssuer: "not-a-url" }).success
    ).toBe(false);
  });

  it("rejects nonceTtlSec below minimum (30)", () => {
    expect(validators.authModePatch.safeParse({ mode: "HYBRID", nonceTtlSec: 10 }).success).toBe(false);
  });
});

// ─── walletOperation ─────────────────────────────────────────────────────────

describe("validators.walletOperation", () => {
  it("accepts valid amount", () => {
    expect(validators.walletOperation.safeParse({ amount: 50.00 }).success).toBe(true);
  });

  it("rejects zero amount", () => {
    expect(validators.walletOperation.safeParse({ amount: 0 }).success).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(validators.walletOperation.safeParse({ amount: -10 }).success).toBe(false);
  });

  it("rejects Infinity", () => {
    expect(validators.walletOperation.safeParse({ amount: Number.POSITIVE_INFINITY }).success).toBe(false);
  });

  it("rejects NaN", () => {
    expect(validators.walletOperation.safeParse({ amount: Number.NaN }).success).toBe(false);
  });

  it("rejects amount over 1,000,000", () => {
    expect(validators.walletOperation.safeParse({ amount: 1_000_001 }).success).toBe(false);
  });

  it("rejects more than 2 decimal places", () => {
    expect(validators.walletOperation.safeParse({ amount: 10.001 }).success).toBe(false);
  });

  it("rejects string amount", () => {
    expect(validators.walletOperation.safeParse({ amount: "50" }).success).toBe(false);
  });

  it("accepts optional methodLabel", () => {
    expect(validators.walletOperation.safeParse({ amount: 25, methodLabel: "Visa" }).success).toBe(true);
  });

  it("rejects methodLabel over 100 chars", () => {
    expect(
      validators.walletOperation.safeParse({ amount: 25, methodLabel: "x".repeat(101) }).success
    ).toBe(false);
  });
});

// ─── analyticsIngest ─────────────────────────────────────────────────────────

describe("validators.analyticsIngest", () => {
  const validEntry = {
    id: "round-123",
    timestamp: 1700000000,
    variant: "2.0",
    bet: 1.0,
    win: 2.0,
    net: 1.0,
    mode: "base",
    cascades: 0,
    bonusTriggered: false,
    multiplier: 1.0,
    winMultiple: 2.0,
    tier: "win",
    balanceAfter: 101.0
  };

  it("accepts valid single entry", () => {
    expect(validators.analyticsIngest.safeParse({ entries: [validEntry] }).success).toBe(true);
  });

  it("rejects entries over 5000", () => {
    const manyEntries = Array.from({ length: 5001 }, (_, i) => ({ ...validEntry, id: `round-${i}` }));
    expect(validators.analyticsIngest.safeParse({ entries: manyEntries }).success).toBe(false);
  });

  it("rejects negative cascades", () => {
    expect(
      validators.analyticsIngest.safeParse({ entries: [{ ...validEntry, cascades: -1 }] }).success
    ).toBe(false);
  });

  it("rejects invalid tier value", () => {
    expect(
      validators.analyticsIngest.safeParse({ entries: [{ ...validEntry, tier: "jackpot" }] }).success
    ).toBe(false);
  });

  it("rejects invalid variant value", () => {
    expect(
      validators.analyticsIngest.safeParse({ entries: [{ ...validEntry, variant: "v3" }] }).success
    ).toBe(false);
  });

  it("rejects Infinity in win field", () => {
    expect(
      validators.analyticsIngest.safeParse({ entries: [{ ...validEntry, win: Number.POSITIVE_INFINITY }] }).success
    ).toBe(false);
  });

  it("rejects entry id with path-traversal characters", () => {
    expect(
      validators.analyticsIngest.safeParse({ entries: [{ ...validEntry, id: "../../etc/passwd" }] }).success
    ).toBe(false);
  });

  it("rejects entry with negative timestamp", () => {
    expect(
      validators.analyticsIngest.safeParse({ entries: [{ ...validEntry, timestamp: -1 }] }).success
    ).toBe(false);
  });
});

// ─── analyticsQuery ───────────────────────────────────────────────────────────

describe("validators.analyticsQuery", () => {
  it("accepts empty query (all optional)", () => {
    expect(validators.analyticsQuery.safeParse({}).success).toBe(true);
  });

  it("accepts valid limit string", () => {
    expect(validators.analyticsQuery.safeParse({ limit: "500" }).success).toBe(true);
  });

  it("rejects non-integer string as limit", () => {
    expect(validators.analyticsQuery.safeParse({ limit: "abc" }).success).toBe(false);
  });

  it("rejects SQL injection in limit field", () => {
    expect(validators.analyticsQuery.safeParse({ limit: "1; DROP TABLE rounds" }).success).toBe(false);
  });

  it("rejects invalid variant string", () => {
    expect(validators.analyticsQuery.safeParse({ variant: "hack" }).success).toBe(false);
  });

  it("accepts known variant values", () => {
    for (const v of ["all", "2.0", "simple", "other"] as const) {
      expect(validators.analyticsQuery.safeParse({ variant: v }).success).toBe(true);
    }
  });
});

// ─── profileSelect ─────────────────────────────────────────────────────────

describe("validators.profileSelect", () => {
  it("accepts valid profileId", () => {
    expect(validators.profileSelect.safeParse({ profileId: "math_base_v2_0" }).success).toBe(true);
  });

  it("rejects empty profileId", () => {
    expect(validators.profileSelect.safeParse({ profileId: "" }).success).toBe(false);
  });

  it("rejects profileId over 100 chars", () => {
    expect(validators.profileSelect.safeParse({ profileId: "x".repeat(101) }).success).toBe(false);
  });
});

// ─── parseOrBadRequest ──────────────────────────────────────────────────────

describe("parseOrBadRequest", () => {
  it("returns parsed data on valid input", () => {
    const result = parseOrBadRequest(validators.profileSelect, { profileId: "math_base_v2_0" });
    expect(result.profileId).toBe("math_base_v2_0");
  });

  it("throws BadRequestException on invalid input", () => {
    expect(() =>
      parseOrBadRequest(validators.walletOperation, { amount: -5 })
    ).toThrow(BadRequestException);
  });

  it("provides field-level details in exception", () => {
    try {
      parseOrBadRequest(validators.walletOperation, { amount: -5 });
      fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as {
        code: string;
        message: string;
        fieldErrors: Record<string, string>;
      };
      expect(body.code).toBe("VALIDATION_FAILED");
      expect(body.message).toBe("Validation failed");
      expect(body.fieldErrors.amount).toBeTruthy();
    }
  });

  it("throws on completely missing required fields", () => {
    expect(() =>
      parseOrBadRequest(validators.authRegister, {})
    ).toThrow(BadRequestException);
  });
});
