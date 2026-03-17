import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Eye in the Sky Admin",
  description: "Internal balancing and simulation workspace."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
