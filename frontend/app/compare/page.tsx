import Link from "next/link";
import { GitCompareArrows, Search } from "lucide-react";

export default function ComparePage() {
  return (
    <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10">
      <div className="glass-card mx-auto max-w-4xl p-8 md:p-10">
        <div className="mb-6 inline-flex rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-300">
          <GitCompareArrows className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-bold text-white">So sanh bat dong san</h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-300">
          Tinh nang so sanh chi tiet dang duoc hoan thien. Hien tai ban co the mo tung bai dang de doi chieu thu cong.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-3 inline-flex rounded-xl border border-blue-400/20 bg-blue-500/10 p-2 text-blue-300">
            <Search className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-white">Tim bai dang de doi chieu</h2>
          <p className="mt-2 text-gray-400">
            Chuyen den bang tin, mo cac bai dang quan tam va so sanh theo gia, dien tich, vi tri va hinh anh.
          </p>
          <Link href="/posts" className="btn-primary mt-5 inline-flex">
            Mo bang tin
          </Link>
        </div>
      </div>
    </div>
  );
}
