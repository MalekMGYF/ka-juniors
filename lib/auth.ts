import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SESSION_COOKIE = "ka_session";
const ADMIN_COOKIE = "ka_admin_session";

function secret() {
  return process.env.SESSION_SECRET as string;
}

export type SessionPayload = {
  userId: string;
  nickname: string;
};

export function createUserSessionToken(payload: SessionPayload) {
  return jwt.sign(payload, secret(), { expiresIn: "30d" });
}

export function verifyUserSessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, secret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionFromCookies(): SessionPayload | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyUserSessionToken(token);
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export function createAdminSessionToken() {
  return jwt.sign({ admin: true }, secret(), { expiresIn: "12h" });
}

export function verifyAdminSessionToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, secret()) as any;
    return payload?.admin === true;
  } catch {
    return false;
  }
}

export function getAdminFromCookies(): boolean {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminSessionToken(token);
}

export function adminCookieName() {
  return ADMIN_COOKIE;
}
