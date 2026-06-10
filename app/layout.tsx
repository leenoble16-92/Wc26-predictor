import type { Metadata, Viewport } from "next";
import "./globals.css";
import CookieConsent from "@/components/CookieConsent";

// Prefer an explicit production URL (set NEXT_PUBLIC_SITE_URL in Vercel to
// https://calleditwc26.app once DNS is live), else the Vercel deployment URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://calleditwc26.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CALLED IT.",
  description: "World Cup 2026 predictions. Six calls, one summer.",
};

export const viewport: Viewport = {
  themeColor: "#101A4A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-GB">
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
