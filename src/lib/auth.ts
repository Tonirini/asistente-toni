import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "at_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 días

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurado");
  return new TextEncoder().encode(secret);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = process.env.APP_PIN_HASH;
  if (!hash) throw new Error("APP_PIN_HASH no está configurado");
  return bcrypt.compare(pin, hash);
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sub: "antonio" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_MAX_AGE = SESSION_DURATION_SECONDS;
