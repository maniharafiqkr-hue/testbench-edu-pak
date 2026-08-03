import { auth } from "@/lib/auth/server";
import { NextResponse, type NextRequest } from "next/server";

const protectWithNeonAuth = auth.middleware({ loginUrl: "/auth/sign-in" });

export default function proxy(request: NextRequest) {
  // Neon Auth 0.4.2 forwards a Server Action POST to its GET-only session
  // endpoint and treats the response as unauthenticated. Every matched action
  // performs its own account/role check, so let those POSTs reach the action.
  if (request.method === "POST" && request.headers.has("next-action")) {
    return NextResponse.next();
  }

  return protectWithNeonAuth(request);
}

export const config = {
  matcher: ["/app/:path*", "/account/:path*", "/onboarding"],
};
