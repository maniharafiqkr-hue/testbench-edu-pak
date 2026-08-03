import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

const FALLBACK_AUTH_URL = "https://auth-not-configured.invalid";
const FALLBACK_COOKIE_SECRET = "testbench-unconfigured-auth-cookie-secret-000000";

export function isAuthConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL?.trim()
      && process.env.NEON_AUTH_COOKIE_SECRET?.trim()
      && process.env.NEON_AUTH_COOKIE_SECRET.trim().length >= 32,
  );
}

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL?.trim() || FALLBACK_AUTH_URL,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET?.trim() || FALLBACK_COOKIE_SECRET,
    sessionDataTtl: 300,
    sameSite: "lax",
  },
  logLevel: process.env.NODE_ENV === "production" ? "error" : "warn",
});
