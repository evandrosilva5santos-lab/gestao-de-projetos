// Tokens extraídos literalmente de "Agency OS.dc.html" (protótipo de design
// fornecido pelo usuário) — const L (claro) e const D (escuro). NÃO alterar
// valores sem conferir contra o arquivo original: mudar aqui é "desviar do layout".
//
// Escopo intencional: estes CSS custom properties são aplicados via `style`
// no elemento raiz de LeadsDashboardShell (mesma técnica do protótipo:
// `style="{{ themeVars }}"`), não em app/globals.css — assim não colidem com
// os tokens shadcn/ui (--card, --border, --accent...) usados pelo resto do
// app. Componentes desta tela usam inline style com var(--x), replicando o
// HTML original 1:1 em vez dos componentes genéricos de components/ui/.
export const AGENCY_OS_LIGHT: Record<string, string> = {
  "--bg": "#f6f8fa", "--card": "#ffffff", "--fg": "#0f172a", "--fg2": "#334155", "--muted": "#64748b", "--faint": "#94a3b8",
  "--border": "#e5e9f0", "--border2": "#eef1f6", "--hover": "#f1f5f9", "--sidebar": "#ffffff", "--panel": "#fbfcfe",
  "--ring": "rgba(15,23,42,0.07)", "--shadow": "0 1px 3px rgba(15,23,42,0.04)",
  "--accent": "#4f46e5", "--accent-h": "#4338ca", "--soft-bg": "#eef2ff", "--soft-fg": "#4338ca", "--input": "#ffffff",
  "--blue-fg": "#2563eb", "--blue-bg": "#eff6ff", "--blue-bd": "#bfdbfe",
  "--em-fg": "#059669", "--em-bg": "#ecfdf5", "--em-bd": "#a7f3d0",
  "--pur-fg": "#9333ea", "--pur-bg": "#faf5ff", "--pur-bd": "#e9d5ff",
  "--or-fg": "#ea580c", "--or-bg": "#fff7ed", "--or-bd": "#fed7aa",
  "--suc": "#10b981", "--des-fg": "#dc2626", "--des-bg": "#fef2f2", "--proc-fg": "#1d4ed8", "--proc-bg": "#dbeafe",
  "--green": "#059669", "--rose": "#f43f5e", "--sky": "#3b82f6"
};

export const AGENCY_OS_DARK: Record<string, string> = {
  "--bg": "#0a0a0c", "--card": "#141417", "--fg": "#f4f4f5", "--fg2": "#d4d4d8", "--muted": "#a1a1aa", "--faint": "#71717a",
  "--border": "#27272a", "--border2": "#1f1f23", "--hover": "#26262b", "--sidebar": "#131316", "--panel": "#151519",
  "--ring": "rgba(255,255,255,0.08)", "--shadow": "none",
  "--accent": "#6366f1", "--accent-h": "#818cf8", "--soft-bg": "rgba(99,102,241,0.16)", "--soft-fg": "#c7d2fe", "--input": "#1c1c20",
  "--blue-fg": "#93c5fd", "--blue-bg": "rgba(59,130,246,0.15)", "--blue-bd": "rgba(59,130,246,0.32)",
  "--em-fg": "#6ee7b7", "--em-bg": "rgba(16,185,129,0.15)", "--em-bd": "rgba(16,185,129,0.32)",
  "--pur-fg": "#d8b4fe", "--pur-bg": "rgba(147,51,234,0.16)", "--pur-bd": "rgba(147,51,234,0.32)",
  "--or-fg": "#fdba74", "--or-bg": "rgba(234,88,12,0.16)", "--or-bd": "rgba(234,88,12,0.32)",
  "--suc": "#10b981", "--des-fg": "#f87171", "--des-bg": "rgba(220,38,38,0.16)", "--proc-fg": "#93c5fd", "--proc-bg": "rgba(37,99,235,0.24)",
  "--green": "#34d399", "--rose": "#fb7185", "--sky": "#60a5fa"
};

export function agencyOsThemeVars(dark: boolean): React.CSSProperties {
  return (dark ? AGENCY_OS_DARK : AGENCY_OS_LIGHT) as React.CSSProperties;
}
