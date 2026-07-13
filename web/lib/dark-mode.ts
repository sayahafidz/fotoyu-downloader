// Minimal dark-mode script that runs BEFORE React hydrates.
// Reads localStorage and sets the "dark" class on <html> immediately
// to prevent a flash of the wrong theme (FOUC).
export const DARK_MODE_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('fotoyu_theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`.trim();

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem("fotoyu_theme");
    return v === "dark" ? "dark" : v === "light" ? "light" : null;
  } catch {
    return null;
  }
}

export function setStoredTheme(t: Theme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("fotoyu_theme", t);
  } catch {
    // ignore
  }
}
