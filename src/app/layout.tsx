import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Glade — Governance that learns",
    template: "%s | Glade",
  },
  description:
    "A decision-centric governance platform for social purpose organisations. Record decisions with context, connect them to living documents, and build institutional memory.",
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
    title: "Glade — Governance that learns",
    description:
      "A decision-centric governance platform for social purpose organisations. Record decisions with context, connect them to living documents, and build institutional memory.",
    url: "https://ourglade.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "Glade — Governance that learns",
    description:
      "A decision-centric governance platform for social purpose organisations. Record decisions, build institutional memory.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
