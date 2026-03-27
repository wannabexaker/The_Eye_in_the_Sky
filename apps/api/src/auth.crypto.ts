import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

const getAuthCookieSecret = () => process.env.AUTH_COOKIE_SECRET?.trim() || "dev-auth-cookie-secret";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
};

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  const [salt, hashedValue] = storedHash.split(":");
  if (!salt || !hashedValue) {
    return false;
  }

  const derived = (await scrypt(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(hashedValue, "hex");

  if (storedBuffer.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derived);
};

export const createSessionToken = () => randomBytes(32).toString("hex");

export const hashSessionToken = (token: string) =>
  createHash("sha256").update(`${getAuthCookieSecret()}:${token}`).digest("hex");
