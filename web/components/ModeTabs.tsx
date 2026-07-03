"use client";

export type Mode = "token" | "paste" | "enhance";

interface ModeTabsProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

export default function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <div className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:flex-row sm:max-w-2xl">
      <TabButton
        active={mode === "token"}
        onClick={() => onChange("token")}
        icon={<KeyIcon active={mode === "token"} />}
        label="Login dengan token"
      />
      <TabButton
        active={mode === "paste"}
        onClick={() => onChange("paste")}
        icon={<ClipboardIcon active={mode === "paste"} />}
        label="Paste JSON"
      />
      <TabButton
        active={mode === "enhance"}
        onClick={() => onChange("enhance")}
        icon={<SparkleIcon active={mode === "enhance"} />}
        label="Prompt AI"
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-600 hover:text-slate-900",
      ].join(" ")}
    >
      <span className="inline-flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
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
