"use client";

import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

export interface SpaceInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
}

export interface UserSpace {
  id: string;
  name: string;
  slug: string;
  role: "admin" | "member" | "observer";
}

interface AppShellProps {
  children: React.ReactNode;
  currentSpace: SpaceInfo;
  userSpaces: UserSpace[];
}

export function AppShell({ children, currentSpace, userSpaces }: AppShellProps) {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      <MobileNav spaceName={currentSpace.name} />
      <div className="hidden md:flex">
        <Sidebar currentSpace={currentSpace} userSpaces={userSpaces} />
      </div>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
