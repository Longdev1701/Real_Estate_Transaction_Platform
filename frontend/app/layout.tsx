import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingCreateButton } from "@/components/layout/FloatingCreateButton";
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
    <html lang="vi">
      <body className="overflow-hidden">
        <AuthSessionProvider>
          <div className="no-scrollbar flex h-screen flex-col overflow-y-auto overflow-x-hidden">
            <Header />
            <main className="flex-1 pt-20">
              {children}
            </main>
            <Footer />
            <FloatingCreateButton />
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
