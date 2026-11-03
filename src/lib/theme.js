const KEY = "lpr_theme";

export function readTheme() {
  const stored = localStorage.getItem(KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("light", theme === "light");
  localStorage.setItem(KEY, theme);
}