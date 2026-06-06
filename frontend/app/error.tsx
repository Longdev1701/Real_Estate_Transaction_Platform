"use client";

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Co loi xay ra</h1>
      <button className="btn-primary px-4 py-2 font-medium" onClick={() => reset()} type="button">
        Thu lai
      </button>
    </main>
  );
}
