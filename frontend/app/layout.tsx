import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingCreateButton } from "@/components/layout/FloatingCreateButton";
import { MainContent } from "@/components/layout/MainContent";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";

export const metadata: Metadata = {
  title: "TrustEstate - Premium Real Estate Platform",
  description: "Mini real estate marketplace for listings, search, consulting chat, and property comparison."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="overflow-hidden" suppressHydrationWarning>
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
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
