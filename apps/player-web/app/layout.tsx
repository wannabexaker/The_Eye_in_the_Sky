import type { Metadata } from "next";
import { Cinzel, Spectral } from "next/font/google";
import "./globals.css";
import "./main-board.css";
// responsive-views.css is the aggregator: it @imports desktop -> portrait -> mobile
// in that order so smaller-viewport rules win. Importing desktop again here would
// re-append it after mobile and break that cascade, so it must NOT be re-imported.
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
      <body className={`${displayFont.variable} ${uiFont.variable}`}>{children}</body>
    </html>
  );
}
