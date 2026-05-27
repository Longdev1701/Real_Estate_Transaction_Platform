export function Footer() {
  return (
    <footer className="glass-panel mt-auto shrink-0">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row lg:px-8">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-wider text-white">
            Trust<span className="text-blue-400">Estate</span>
          </span>
        </div>

        <p className="text-sm text-gray-400">
          &copy; {new Date().getFullYear()} TrustEstate. All rights reserved.
        </p>

        <div className="flex gap-4 text-sm text-gray-400">
          <a href="#" className="transition-colors hover:text-white">{"Ch\u00ednh s\u00e1ch"}</a>
          <a href="#" className="transition-colors hover:text-white">{"\u0110i\u1ec1u kho\u1ea3n"}</a>
          <a href="#" className="transition-colors hover:text-white">{"Li\u00ean h\u1ec7"}</a>
        </div>
      </div>
    </footer>
  );
}
