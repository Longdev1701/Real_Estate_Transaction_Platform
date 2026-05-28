"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessagesRoute = pathname?.startsWith("/messages");

  useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");
    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [pathname]);

  return <main className={`flex-1 min-h-0 ${isMessagesRoute ? "" : "pt-20"}`}>{children}</main>;
}
