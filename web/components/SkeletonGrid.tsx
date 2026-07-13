"use client";

export default function SkeletonGrid() {
  return (
    <div className="w-full animate-fade-in space-y-5">
      {/* Stats bar skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-shimmer rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-28 animate-shimmer rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-10 w-36 animate-shimmer rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>

      {/* Card skeletons */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="aspect-[2/3] w-full animate-shimmer bg-slate-200 dark:bg-slate-700" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-4 w-3/4 animate-shimmer rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-1/2 animate-shimmer rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mt-2 h-8 w-full animate-shimmer rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
