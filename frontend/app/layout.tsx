import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingCreateButton } from "@/components/layout/FloatingCreateButton";
import { FloatingCompareBar } from "@/components/layout/FloatingCompareBar";
import { MainContent } from "@/components/layout/MainContent";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ToastProvider } from "@/components/theme/ToastProvider";

import { ToastContainer } from "@/components/layout/ToastContainer";
import { ConfirmContainer } from "@/components/layout/ConfirmContainer";

const themeInitScript = `
  (() => {
    const storageKey = "theme-preference";
    const stored = window.localStorage.getItem(storageKey);
    const preference = stored === "light" || stored === "dark" || stored === "default"
      ? stored
      : "default";
    const resolved = preference === "default"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
  })();
`;

export const metadata: Metadata = {
  title: "TrustEstate - Nền tảng giao dịch bất động sản",
  description: "Nền tảng bất động sản cho đăng tin, tìm kiếm, tư vấn qua trò chuyện và so sánh bất động sản."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="overflow-hidden" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <AuthSessionProvider>
            <div
              id="main-scroll-container"
              suppressHydrationWarning
              className="no-scrollbar flex h-screen flex-col overflow-y-auto overflow-x-hidden"
            >
              <Header />
              <MainContent>{children}</MainContent>
              <Footer />
              <FloatingCreateButton />
              <FloatingCompareBar />
              <MobileBottomNav />
              <ToastContainer />
              <ConfirmContainer />
            </div>
            <ToastProvider />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
