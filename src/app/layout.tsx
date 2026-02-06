import type { Metadata } from "next";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "NanoLoc",
  description: "AI-powered i18n management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="antialiased bg-gray-950 text-white selection:bg-indigo-500/30 font-sans">
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
