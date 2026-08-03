"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <NeonAuthUIProvider
      authClient={authClient}
      defaultTheme="light"
      emailOTP={false}
      Link={Link}
      navigate={router.push}
      onSessionChange={() => router.refresh()}
      passkey={false}
      redirectTo="/onboarding"
      replace={router.replace}
      social={{ providers: [] }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
