export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <section className="text-center max-w-4xl mx-auto py-20">
        <p className="text-sm font-medium uppercase tracking-widest text-blue-400 mb-4">
          Sàn giao dịch bất động sản
        </p>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
          Trust<span className="text-blue-500">Estate</span> Platform
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          Nền tảng đáng tin cậy, tìm kiếm nâng cao, tư vấn realtime, bản đồ vị trí và so sánh bất động sản.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="btn-primary px-8 py-3 text-lg">
            Khám phá dự án
          </button>
          <button className="glass-card px-8 py-3 text-lg hover:bg-white/10 transition-colors">
            Tìm kiếm nhà đất
          </button>
        </div>
      </section>
    </div>
  );
}
