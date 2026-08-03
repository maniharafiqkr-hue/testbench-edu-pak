import { redirect } from "next/navigation";
import { requireStaffAccess } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function StaffEntryPage() {
  const access = await requireStaffAccess();
  redirect(access.user.role === "question_author" ? "/staff/author" : "/staff");
}
