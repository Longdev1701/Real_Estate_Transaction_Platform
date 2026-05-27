import { PostList } from "@/components/post/PostList";

export default function PostsPage() {
  return (
    <div className="container mx-auto flex h-[calc(100vh-5rem)] flex-col overflow-hidden px-4 py-6 lg:px-8 lg:py-8">
      <PostList />
    </div>
  );
}
