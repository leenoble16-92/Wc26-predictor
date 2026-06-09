import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
      <body>{children}</body>
    </html>
  );
}
