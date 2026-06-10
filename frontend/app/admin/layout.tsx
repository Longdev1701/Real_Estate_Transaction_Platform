import { AdminQueryProvider } from "@/components/admin/AdminQueryProvider";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AdminQueryProvider>{children}</AdminQueryProvider>;
}
