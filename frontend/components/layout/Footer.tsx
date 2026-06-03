"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (
    pathname?.startsWith("/messages") ||
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/posts")
  ) {
    return null;
  }

  return (
    <footer className="glass-panel mt-auto shrink-0">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-center md:flex-row md:items-start md:text-left lg:px-8">
        <div className="space-y-1">
          <span className="text-xl font-bold tracking-wider text-white">TrustEstate</span>
          <p className="text-sm text-gray-400">support@trustestate.com · 1900 1234</p>
        </div>

        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} TrustEstate. All rights reserved.
        </p>

        <div className="flex gap-4 text-sm text-gray-400">
          <a href="#" className="transition-colors hover:text-white">
            Chính sách
          </a>
          <a href="#" className="transition-colors hover:text-white">
            Điều khoản
          </a>
          <a href="#" className="transition-colors hover:text-white">
            Liên hệ
          </a>
        </div>
      </div>
    </footer>
  );
}
