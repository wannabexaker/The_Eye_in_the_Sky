import { getSessionCookieSameSite } from "./auth.helpers";

describe("auth cookie helpers", () => {
  const originalCookieSecure = process.env.COOKIE_SECURE;

  afterEach(() => {
    if (originalCookieSecure === undefined) {
      delete process.env.COOKIE_SECURE;
    } else {
      process.env.COOKIE_SECURE = originalCookieSecure;
    }
  });

  it("uses lax cookies by default", () => {
    delete process.env.COOKIE_SECURE;

    expect(getSessionCookieSameSite()).toBe("lax");
  });

  it("uses cross-site cookies when secure cookies are explicitly enabled", () => {
    process.env.COOKIE_SECURE = "true";

    expect(getSessionCookieSameSite()).toBe("none");
  });
});
