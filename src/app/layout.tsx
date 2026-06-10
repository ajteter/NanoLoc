import type { Metadata } from "next";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { auth } from "@/auth";
import { getServerLocale, getServerTranslator } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslator();

  return {
    title: {
      default: 'NanoLoc',
      template: '%s | NanoLoc',
    },
    description: t('metadata.description'),
  };
}

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
