import type { Metadata } from "next";
import { Cinzel, Spectral } from "next/font/google";
import { ApiOfflineBadge } from "@/components/runtime/api-offline-badge";
import "./globals.css";
import "./main-board.css";
import "./styles/responsive-views.css";

const displayFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display"
});

const uiFont = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui"
});

export const metadata: Metadata = {
  title: "The Eye in the Sky",
  description: "Occult slot prototype with fake balance and cascading cluster wins.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${uiFont.variable}`}>
        {children}
        <ApiOfflineBadge />
      </body>
    </html>
  );
}
