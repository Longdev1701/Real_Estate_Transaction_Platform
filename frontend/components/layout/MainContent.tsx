"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getVersionedStorageKey } from "@/lib/client-cache";

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessagesRoute = pathname?.startsWith("/messages");
  const isAdminRoute = pathname?.startsWith("/admin");
  const isFullScreenRoute = isMessagesRoute || isAdminRoute || pathname === "/posts/create";

  useEffect(() => {
    const scrollContainer = document.getElementById("main-scroll-container");
    const shouldPreservePostList =
      Boolean(pathname?.startsWith("/posts")) &&
      Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index))
        .some((key) => key?.startsWith(getVersionedStorageKey("posts_page_state:")));

    if (shouldPreservePostList) {
      return;
    }

    if (scrollContainer) {
      scrollContainer.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <main className={`flex-1 ${isFullScreenRoute ? "min-h-0" : ""} ${isMessagesRoute || isAdminRoute ? "" : "pt-20"}`}>
      {children}
    </main>
  );
}
