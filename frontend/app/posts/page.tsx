import { PostList } from "@/components/post/PostList";

export default function PostsPage() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-5rem)] xl:h-[calc(100vh-5rem)] xl:min-h-0 xl:overflow-hidden flex-col px-4 py-5 lg:px-8 lg:py-8 xl:py-5">
      <PostList />
    </div>
  );
}
