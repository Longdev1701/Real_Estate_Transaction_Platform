"use client";

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center text-white">
      <h1 className="text-2xl font-semibold">Có lỗi xảy ra</h1>
      <button
        className="rounded bg-emerald-500 px-4 py-2 font-medium text-neutral-950"
        onClick={() => reset()}
        type="button"
      >
        Thử lại
      </button>
    </main>
  );
}
