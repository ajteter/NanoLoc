import type { Metadata } from "next";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { auth } from "@/auth";
import { getServerLocale } from "@/lib/i18n/server";

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
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning className="dark">
      <body
        className="font-sans antialiased bg-zinc-950 text-white selection:bg-zinc-400/30"
      >
        <Providers session={await auth()} locale={locale}>
          <SiteHeader />
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
