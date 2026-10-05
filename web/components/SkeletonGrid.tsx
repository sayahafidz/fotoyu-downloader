"use client";

export default function SkeletonGrid() {
  return (
    <div className="w-full animate-fade-in space-y-5">
      {/* Stats bar skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Card skeletons: 2 cols on mobile, 3 on tablet, 4 on small desktop, 5 on wide desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="aspect-[2/3] w-full animate-pulse bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col gap-2 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-1/2 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/60" />
              <div className="mt-2 h-9 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
