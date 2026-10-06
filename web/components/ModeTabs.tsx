"use client";

export type Mode = "bookmarklet" | "token" | "paste" | "enhance";

interface ModeTabsProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  onOpenAndroidGuide?: () => void;
}

const modes: { id: Mode; label: string }[] = [
  { id: "bookmarklet", label: "Dari Fotoyu" },
  { id: "token", label: "Token login" },
  { id: "paste", label: "File / JSON" },
  { id: "enhance", label: "Prompt edit" },
];

export default function ModeTabs({ mode, onChange }: ModeTabsProps) {
  return (
    <nav aria-label="Cara memuat foto" className="mode-tabs">
      {modes.map((item) => (
        <button key={item.id} type="button" aria-current={mode === item.id ? "page" : undefined}
          onClick={() => onChange(item.id)} className={mode === item.id ? "is-active" : ""}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
