import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description:
    "Create a free Glade account. Start recording governance decisions and building institutional memory for your organisation.",
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
