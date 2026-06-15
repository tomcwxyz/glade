"use client";

import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Walkthrough } from "./walkthrough";
import { SkipLink } from "./skip-link";
import { LiveRegionProvider } from "./live-region";
import { CommandPalette } from "./command-palette";

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
  isSuperAdmin?: boolean;
}

export function AppShell({ children, currentSpace, userSpaces, isSuperAdmin }: AppShellProps) {
  return (
    <LiveRegionProvider>
      <SkipLink />
      <div className="flex flex-col md:flex-row h-screen overflow-hidden">
        <MobileNav currentSpace={currentSpace} userSpaces={userSpaces} />
        <div className="hidden md:flex">
          <Sidebar currentSpace={currentSpace} userSpaces={userSpaces} isSuperAdmin={isSuperAdmin} />
        </div>
        <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>{children}</main>
        <Walkthrough />
        <CommandPalette />
      </div>
    </LiveRegionProvider>
  );
}
