import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { Bell, Heart } from "lucide-react";

export function Header() {
  return (
    <header className="fixed top-0 w-full z-40 glass-panel">
      <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-white tracking-wider flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
              T
            </span>
            Trust<span className="text-blue-400">Estate</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
            <Link href="/" className="hover:text-blue-400 transition-colors">
              Trang chủ
            </Link>
            <Link href="/posts" className="hover:text-blue-400 transition-colors">
              Bài đăng
            </Link>
            <Link href="/projects" className="hover:text-blue-400 transition-colors">
              Dự án
            </Link>
            <Link href="/compare" className="hover:text-blue-400 transition-colors">
              So sánh
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>
          
          <button className="p-2 text-gray-400 hover:text-red-400 transition-colors">
            <Heart size={20} />
          </button>

          <Link href="/posts/create" className="hidden sm:block btn-primary ml-2">
            + Đăng tin
          </Link>
          
          <div className="w-px h-8 bg-white/10 mx-2"></div>
          
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
