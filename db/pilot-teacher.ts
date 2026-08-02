import "server-only";

import { getDb } from "@/db";
import { users } from "@/db/schema";

const PILOT_TEACHER_EMAIL = "pilot-english-teacher@testbench.local";

export async function ensurePilotTeacher() {
  const [teacher] = await getDb()
    .insert(users)
    .values({
      displayName: "Pilot English teacher",
      email: PILOT_TEACHER_EMAIL,
      isActive: true,
      role: "teacher",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        displayName: "Pilot English teacher",
        isActive: true,
        role: "teacher",
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });

  return teacher.id;
}
