"use client";

import { usePathname } from "next/navigation";

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessagesRoute = pathname?.startsWith("/messages");

  return <main className={`flex-1 min-h-0 ${isMessagesRoute ? "" : "pt-20"}`}>{children}</main>;
}
