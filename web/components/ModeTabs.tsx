"use client";

export type Mode = "token" | "paste";

interface ModeTabsProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export default function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <div className="inline-flex w-full max-w-md items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange("token")}
        className={[
          "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
          mode === "token"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900",
        ].join(" ")}
      >
        <span className="inline-flex items-center gap-2">
          <KeyIcon active={mode === "token"} />
          Login dengan token
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange("paste")}
        className={[
          "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
          mode === "paste"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-600 hover:text-slate-900",
        ].join(" ")}
      >
        <span className="inline-flex items-center gap-2">
          <ClipboardIcon active={mode === "paste"} />
          Paste JSON
        </span>
      </button>
    </div>
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
