import type { Metadata } from "next";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: {
    default: 'NanoLoc',
    template: '%s | NanoLoc',
  },
  description: "AI-powered i18n management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className="font-sans antialiased bg-zinc-950 text-white selection:bg-zinc-400/30"
      >
        <Providers session={await auth()}>
          <SiteHeader />
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
