import { PostList } from "@/components/post/PostList";

export default function PostsPage() {
  return (
    <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10">
      <section className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-400">
        <span>Trang chu</span>
        <span>/</span>
        <span className="text-white">Bai dang</span>
      </section>

      <PostList />
    </div>
  );
}
