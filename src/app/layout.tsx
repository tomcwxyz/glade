import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Glade — Governance that learns",
    template: "%s | Glade",
  },
  description:
    "A decision-centric platform for transparent, learning-oriented governance",
  metadataBase: new URL("https://ourglade.app"),
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
