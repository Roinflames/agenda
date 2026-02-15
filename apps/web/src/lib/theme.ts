const THEME_KEY = 'centrofit_theme';

export type UiTheme = 'corporativa' | 'verde';

function isUiTheme(value: string | null): value is UiTheme {
  return value === 'corporativa' || value === 'verde';
}

export function getStoredTheme(): UiTheme {
  if (typeof window === 'undefined') return 'corporativa';
  const raw = localStorage.getItem(THEME_KEY);
  if (raw === 'calida') return 'verde';
  return isUiTheme(raw) ? raw : 'corporativa';
}

export function applyTheme(theme: UiTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme: UiTheme) {
  if (typeof window !== 'undefined') localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

export function toggleTheme(theme: UiTheme): UiTheme {
  return theme === 'corporativa' ? 'verde' : 'corporativa';
}
