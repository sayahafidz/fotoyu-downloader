"use client";

export type Mode = "bookmarklet" | "token" | "paste" | "enhance";

interface ModeTabsProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  onOpenAndroidGuide?: () => void;
}

export default function ModeTabs({ mode, onChange, onOpenAndroidGuide }: ModeTabsProps) {
  const tabs: Array<{
    id: Mode;
    label: string;
    shortLabel: string;
    icon: string;
    badge?: string;
  }> = [
    {
      id: "bookmarklet",
      label: "1-Klik Otomatis",
      shortLabel: "⚡ 1-Klik",
      icon: "⚡",
      badge: "Utama",
    },
    {
      id: "token",
      label: "Login Token",
      shortLabel: "🔑 Token",
      icon: "🔑",
    },
    {
      id: "paste",
      label: "Paste JSON",
      shortLabel: "📋 JSON",
      icon: "📋",
    },
    {
      id: "enhance",
      label: "AI Prompt",
      shortLabel: "✨ AI",
      icon: "✨",
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Mobile & Tablet Compact Segmented Pill Bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={[
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl py-2 px-2.5 text-xs sm:text-sm font-bold transition-all active:scale-95",
                  active
                    ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                ].join(" ")}
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                <span className="inline xs:hidden sm:hidden">{tab.shortLabel}</span>
                {tab.badge && active && (
                  <span className="hidden md:inline rounded-full bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.2 text-[9px] text-indigo-700 dark:text-indigo-300 font-extrabold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {onOpenAndroidGuide && (
          <button
            type="button"
            onClick={onOpenAndroidGuide}
            className="flex h-10 w-10 sm:w-auto items-center justify-center gap-1.5 shrink-0 rounded-2xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 transition-all active:scale-95"
            title="Panduan HP Android"
          >
            <span className="text-base">📱</span>
            <span className="hidden sm:inline">Panduan HP</span>
          </button>
        )}
      </div>
    </div>
  );
}
