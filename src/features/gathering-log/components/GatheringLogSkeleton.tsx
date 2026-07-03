import React from 'react';

/**
 * Loading skeleton for the gathering-log page (sidebar + list gray blocks).
 * Kept dependency-free so it can double as the route-level Suspense fallback
 * without pulling the feature chunk into the main bundle.
 */
export const GatheringLogSkeleton: React.FC = () => (
  <div className="max-w-[1600px] mx-auto p-4 flex flex-col md:flex-row gap-6 items-start animate-pulse" aria-busy="true">
    {/* Sidebar skeleton */}
    <div className="hidden md:flex w-60 shrink-0 flex-col gap-3">
      <div className="h-8 rounded-lg bg-slate-200 dark:bg-slate-700" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-6 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${85 - (i % 3) * 15}%` }} />
      ))}
    </div>

    {/* Main list skeleton */}
    <div className="flex-grow w-full min-w-0 flex flex-col gap-4">
      <div className="h-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800">
            <div className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="w-10 h-10 rounded bg-slate-200 dark:bg-slate-700 shrink-0" />
            <div className="flex-grow flex flex-col gap-2">
              <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${55 - (i % 4) * 8}%` }} />
              <div className="h-3 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${35 - (i % 3) * 6}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
