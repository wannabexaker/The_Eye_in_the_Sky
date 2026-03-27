import type { RequestWithAuth } from "./auth.types";

export const AUTH_SESSION_COOKIE = "eye_auth_session";
export const AUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const parseCookies = (
  cookieHeader: string | undefined
): Record<string, string> => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(";").reduce<Record<string, string>>((accumulator, chunk) => {
    const [rawKey, ...rawValue] = chunk.split("=");
    const key = rawKey?.trim();
    if (!key) {
      return accumulator;
    }

    accumulator[key] = decodeURIComponent(rawValue.join("=").trim());
    return accumulator;
  }, {});
};

export const getRequestSessionToken = (request: RequestWithAuth) => {
  const cookieHeaderValue = request.headers?.cookie;
  const cookieHeader =
    typeof cookieHeaderValue === "string"
      ? cookieHeaderValue
      : Array.isArray(cookieHeaderValue)
        ? cookieHeaderValue[0]
        : undefined;

  return parseCookies(cookieHeader)[AUTH_SESSION_COOKIE] ?? null;
};

export const getRequestIpAddress = (request: RequestWithAuth) =>
  request.ip ?? request.socket?.remoteAddress ?? null;

export const isSecureRequest = (request: RequestWithAuth) => {
  const forwardedProto = request.headers?.["x-forwarded-proto"];
  const proto =
    typeof forwardedProto === "string"
      ? forwardedProto
      : Array.isArray(forwardedProto)
        ? forwardedProto[0]
        : undefined;

  return request.secure === true || proto === "https" || process.env.NODE_ENV === "production";
};
