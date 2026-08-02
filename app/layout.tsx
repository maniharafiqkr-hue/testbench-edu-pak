import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TestBench — Turn every English test into a plan",
    template: "%s | TestBench",
  },
  description:
    "FBISE Grade 10 English practice that shows students why marks were lost, what to rewrite, and what to retest next.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
