const crypto = require("crypto");

const COOKIE_NAME = "eclub_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sign(value) {
  const secret = getSessionSecret();
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createSessionCookie() {
  const payload = {
    role: "dra-emlyn",
    exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

function buildCookieHeader(value) {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function readCookies(cookieHeader) {
  const cookies = {};
  const header = String(cookieHeader || "");
  header.split(";").forEach((segment) => {
    const index = segment.indexOf("=");
    if (index === -1) return;
    const key = segment.slice(0, index).trim();
    const value = segment.slice(index + 1).trim();
    if (key) {
      cookies[key] = value;
    }
  });
  return cookies;
}

function verifySession(cookieHeader) {
  const secret = getSessionSecret();
  if (!secret) return { authenticated: false, reason: "missing_secret" };

  const cookies = readCookies(cookieHeader);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return { authenticated: false, reason: "missing_cookie" };

  const parts = raw.split(".");
  if (parts.length !== 2) return { authenticated: false, reason: "invalid_cookie" };

  const [encoded, signature] = parts;
  if (!timingSafeEqual(sign(encoded), signature)) {
    return { authenticated: false, reason: "invalid_signature" };
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || payload.role !== "dra-emlyn") {
      return { authenticated: false, reason: "invalid_role" };
    }
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) {
      return { authenticated: false, reason: "expired" };
    }
    return { authenticated: true, payload };
  } catch {
    return { authenticated: false, reason: "invalid_payload" };
  }
}

function isValidPassword(password) {
  const configured = getAdminPassword();
  if (!configured) return false;
  return timingSafeEqual(password, configured);
}

module.exports = {
  COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getSessionSecret,
  getAdminPassword,
  createSessionCookie,
  clearSessionCookie,
  buildCookieHeader,
  readCookies,
  verifySession,
  isValidPassword
};
