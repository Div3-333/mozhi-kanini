import { ThemeName, ThemeConfig } from "./types";

export const LANGUAGES = [
  { label: "Sanskrit", value: "sanskrit" },
  { label: "Tamil", value: "tamil" },
  { label: "Malayalam", value: "malayalam" },
  { label: "Kannada", value: "kannada" },
  { label: "Telugu", value: "telugu" },
  { label: "Hindi", value: "hindi" },
];

export const THEMES: Record<ThemeName, ThemeConfig> = {
  obsidian: { bg: "bg-[#050507]", text: "text-slate-300", panel: "bg-[#08080a]", hud: "bg-black/60" },
  paper: { bg: "bg-[#f4f1ea]", text: "text-slate-800", panel: "bg-[#fffdfa]", hud: "bg-white/80" },
  slate: { bg: "bg-[#0f172a]", text: "text-slate-200", panel: "bg-[#1e293b]", hud: "bg-[#0f172a]/80" }
};
