import Link from "next/link";
import { Building2, FolderKanban } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10">
      <div className="glass-card mx-auto max-w-4xl p-8 md:p-10">
        <div className="mb-6 inline-flex rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-300">
          <FolderKanban className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-bold text-white">Du an</h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-300">
          Khu vuc nay se tap trung cac du an bat dong san duoc tong hop theo khu vuc va phan khuc.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="mb-3 inline-flex rounded-xl border border-blue-400/20 bg-blue-500/10 p-2 text-blue-300">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Kham pha bai dang hien co</h2>
            <p className="mt-2 text-gray-400">
              Trong luc cho khu vuc du an hoan thien, ban co the tiep tuc tim kiem tren danh sach bai dang.
            </p>
            <Link href="/posts" className="btn-primary mt-5 inline-flex">
              Den bang tin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
