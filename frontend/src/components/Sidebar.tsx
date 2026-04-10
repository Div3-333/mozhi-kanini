import React from "react";
import { ThemeName } from "../types";
import { THEMES } from "../constants";

interface SidebarProps {
  view: "editor" | "library";
  setView: (view: "editor" | "library") => void;
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  onRefreshLibrary: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ view, setView, theme, setTheme, onRefreshLibrary }) => {
  return (
    <div className="w-16 flex-shrink-0 bg-black border-r border-white/5 flex flex-col items-center py-8 gap-8 z-50">
      <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center cursor-pointer" onClick={() => setView("editor")}>
        <span className="text-white font-bold text-lg italic">D</span>
      </div>
      <button onClick={() => setView("editor")} className={`p-2 rounded-lg transition-all ${view === 'editor' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
      </button>
      <button onClick={() => { onRefreshLibrary(); setView("library"); }} className={`p-2 rounded-lg transition-all ${view === 'library' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
      </button>
      <div className="mt-auto flex flex-col gap-4">
          {(Object.keys(THEMES) as ThemeName[]).map(t => (
              <div key={t} onClick={() => setTheme(t)} className={`w-4 h-4 rounded-full cursor-pointer border-2 ${theme === t ? 'border-indigo-500' : 'border-white/10'} ${THEMES[t].bg}`} />
          ))}
      </div>
    </div>
  );
};
