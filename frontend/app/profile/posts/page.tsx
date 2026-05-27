"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { LoaderCircle } from "lucide-react";

import { api } from "@/lib/api";
import { PostCard } from "@/components/post/PostCard";
import { useAuthStore } from "@/stores/auth.store";
import type { Post, PostListData } from "@/lib/posts";

export default function ProfilePostsPage() {
  const { user, hasHydrated, isLoadingUser } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasHydrated || !user) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<{ data: PostListData }>("/posts?limit=100");
        if (isMounted) {
          setPosts(response.data.data.items);
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message?: string }>;
        if (isMounted) {
          setError(axiosError.response?.data?.message ?? "Khong the tai bai dang cua ban.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, [hasHydrated, user]);

  const myPosts = useMemo(
    () => (user ? posts.filter((post) => post.author.id === user.id) : []),
    [posts, user],
  );

  if (!hasHydrated || isLoadingUser) {
    return null;
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10">
        <div className="glass-card mx-auto max-w-3xl p-8 text-center">
          <p className="text-lg text-gray-300">Vui long dang nhap de xem bai dang cua ban.</p>
          <Link href="/auth/login" className="btn-primary mt-6 inline-flex">
            Dang nhap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8 lg:py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white">Bai dang cua ban</h1>
        <p className="mt-3 text-gray-400">Tong hop cac bai dang dang hien thi tren he thong cua tai khoan hien tai.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="glass-card flex min-h-[240px] items-center justify-center">
          <div className="inline-flex items-center gap-3 text-gray-300">
            <LoaderCircle className="h-5 w-5 animate-spin text-blue-300" />
            Dang tai bai dang...
          </div>
        </div>
      ) : myPosts.length === 0 ? (
        <div className="glass-card p-8 text-center text-gray-300">
          Ban chua co bai dang nao dang hien thi. Hay tao bai dang moi tren bang tin.
        </div>
      ) : (
        <div className="space-y-5">
          {myPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
