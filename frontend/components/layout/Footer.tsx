export function Footer() {
  return (
    <footer className="glass-panel mt-auto">
      <div className="container mx-auto px-4 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white tracking-wider">
            Trust<span className="text-blue-400">Estate</span>
          </span>
        </div>
        
        <p className="text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} TrustEstate. All rights reserved.
        </p>
        
        <div className="flex gap-4 text-sm text-gray-400">
          <a href="#" className="hover:text-white transition-colors">Chính sách</a>
          <a href="#" className="hover:text-white transition-colors">Điều khoản</a>
          <a href="#" className="hover:text-white transition-colors">Liên hệ</a>
        </div>
      </div>
    </footer>
  );
}
