import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glade — Governance that learns",
  description:
    "A decision-centric platform for transparent, learning-oriented governance",
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
