"use client";

export type Mode = "bookmarklet" | "token" | "paste" | "enhance";

interface ModeTabsProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export default function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <div className="space-y-3">
      {/* Recommended badge */}
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">Pilih cara download:</span>
      </div>
      
      <div className="grid gap-2 sm:grid-cols-2">
        <TabButton
          active={mode === "bookmarklet"}
          onClick={() => onChange("bookmarklet")}
          icon={<BoltIcon active={mode === "bookmarklet"} />}
          label="Console (Mobile)"
          badge="TERMUDAH"
          badgeColor="emerald"
          description="Copy-paste kode ke Console fotoyu.com"
        />
        <TabButton
          active={mode === "token"}
          onClick={() => onChange("token")}
          icon={<KeyIcon active={mode === "token"} />}
          label="Login Manual"
          badge="MUDAH"
          badgeColor="blue"
          description="Copy data login dari browser"
        />
        <TabButton
          active={mode === "paste"}
          onClick={() => onChange("paste")}
          icon={<ClipboardIcon active={mode === "paste"} />}
          label="Paste JSON"
          badge="LANJUTAN"
          badgeColor="slate"
          description="Untuk pengguna teknis"
        />
        <TabButton
          active={mode === "enhance"}
          onClick={() => onChange("enhance")}
          icon={<SparkleIcon active={mode === "enhance"} />}
          label="Prompt AI"
          badge="BONUS"
          badgeColor="purple"
          description="Percantik foto dengan AI"
        />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
  badgeColor,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: "emerald" | "blue" | "slate" | "purple";
  description?: string;
}) {
  const badgeColors = {
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    purple: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
        active
          ? "border-indigo-500 bg-indigo-50 shadow-md"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm",
      ].join(" ")}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className={[
            "text-sm font-semibold",
            active ? "text-indigo-900" : "text-slate-900"
          ].join(" ")}>
            {label}
          </span>
        </div>
        {badge && (
          <span className={[
            "rounded-full border px-2 py-0.5 text-[10px] font-bold",
            badgeColors[badgeColor || "slate"]
          ].join(" ")}>
            {badge}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-slate-600 leading-relaxed">
          {description}
        </p>
      )}
    </button>
  );
}

function BoltIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={["h-5 w-5", active ? "text-indigo-600" : "text-emerald-600"].join(" ")}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function KeyIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={["h-4 w-4", active ? "text-indigo-600" : ""].join(" ")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function ClipboardIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={["h-4 w-4", active ? "text-indigo-600" : ""].join(" ")}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function SparkleIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={["h-4 w-4", active ? "text-indigo-600" : ""].join(" ")}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M12 2l1.6 4.6L18 8l-4.4 1.4L12 14l-1.6-4.6L6 8l4.4-1.4L12 2z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" opacity="0.7" />
      <path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" opacity="0.7" />
    </svg>
  );
}
