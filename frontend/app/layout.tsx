import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingCreateButton } from "@/components/layout/FloatingCreateButton";

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
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow pt-20">
          {children}
        </main>
        <Footer />
        <FloatingCreateButton />
      </body>
    </html>
  );
}
