import { TreePine } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Minimal header */}
      <header className="px-8 py-5">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-canopy text-paper">
            <TreePine size={18} strokeWidth={2.5} />
          </div>
          <span
            className="text-lg tracking-tight font-semibold text-bark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Glade
          </span>
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-8 pb-16">
        {children}
      </main>
    </div>
  );
}
