import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Glade — Governance that grows with your organisation",
    template: "%s | Glade",
  },
  description:
    "A governance platform that treats decisions as institutional memory. Track, connect, and learn from every choice your organisation makes.",
  metadataBase: new URL("https://ourglade.app"),
  keywords: [
    "governance platform",
    "decision tracking",
    "charity governance",
    "board management",
    "institutional memory",
    "cooperative governance",
    "CIC governance",
    "consent decision making",
    "governance documents",
    "meeting management",
  ],
  authors: [{ name: "The Good Ship" }],
  creator: "The Good Ship",
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: "Glade",
    title: "Glade — Governance that grows with your organisation",
    description:
      "A governance platform that treats decisions as institutional memory. Track, connect, and learn from every choice your organisation makes.",
    url: "https://ourglade.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glade — Governance that grows with your organisation",
    description:
      "A governance platform that treats decisions as institutional memory. Track, connect, and learn from every choice your organisation makes.",
  },
  alternates: {
    canonical: "https://ourglade.app",
  },
  robots: {
    index: true,
    follow: true,
  },
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
