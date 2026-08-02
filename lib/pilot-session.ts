import "server-only";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { users } from "@/db/schema";

const PILOT_STUDENT_COOKIE = "tb_pilot_student";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getPilotStudentId() {
  const cookieStore = await cookies();
  const studentId = cookieStore.get(PILOT_STUDENT_COOKIE)?.value;

  if (!studentId || !UUID_PATTERN.test(studentId)) {
    return null;
  }

  const [student] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);

  return student?.id ?? null;
}

export async function ensurePilotStudent() {
  const existingStudentId = await getPilotStudentId();
  if (existingStudentId) {
    return existingStudentId;
  }

  const studentId = randomUUID();
  await getDb().insert(users).values({
    id: studentId,
    email: `pilot-${studentId}@testbench.local`,
    displayName: "Pilot student",
    role: "student",
    gradeLevel: "grade_10",
  });

  const cookieStore = await cookies();
  cookieStore.set(PILOT_STUDENT_COOKIE, studentId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return studentId;
}
