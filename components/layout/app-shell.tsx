"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileDrawer } from "./mobile-drawer";

export function AppShell({ children, userName }: { children: React.ReactNode, userName: string }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="h-full bg-[var(--background)]">
      <MobileDrawer open={sidebarOpen} setOpen={setSidebarOpen} />
      <Sidebar />
      <div className="lg:pl-72 h-full flex flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} userName={userName} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
