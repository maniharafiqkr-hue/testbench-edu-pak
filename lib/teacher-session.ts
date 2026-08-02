import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const TEACHER_SESSION_COOKIE = "tb_teacher_session";
const TEACHER_SESSION_MESSAGE = "testbench:pilot-teacher:v1";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getTeacherAccessCode() {
  const code = process.env.TEACHER_ACCESS_CODE?.trim();
  return code && code.length >= 12 ? code : null;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function expectedSessionToken(code: string) {
  return createHmac("sha256", code).update(TEACHER_SESSION_MESSAGE).digest("base64url");
}

export function isTeacherAccessConfigured() {
  return getTeacherAccessCode() !== null;
}

export function teacherAccessCodeMatches(candidate: string) {
  const configuredCode = getTeacherAccessCode();
  if (!configuredCode) {
    return false;
  }

  return timingSafeEqual(digest(candidate.trim()), digest(configuredCode));
}

export async function createTeacherSession() {
  const configuredCode = getTeacherAccessCode();
  if (!configuredCode) {
    throw new Error("Teacher access is not configured.");
  }

  const cookieStore = await cookies();
  cookieStore.set(TEACHER_SESSION_COOKIE, expectedSessionToken(configuredCode), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/staff",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function hasTeacherSession() {
  const configuredCode = getTeacherAccessCode();
  if (!configuredCode) {
    return false;
  }

  const sessionToken = (await cookies()).get(TEACHER_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return false;
  }

  return timingSafeEqual(
    digest(sessionToken),
    digest(expectedSessionToken(configuredCode)),
  );
}

export async function requireTeacherSession() {
  if (!(await hasTeacherSession())) {
    redirect("/staff/login");
  }
}

export async function clearTeacherSession() {
  const cookieStore = await cookies();
  cookieStore.delete(TEACHER_SESSION_COOKIE);
}
