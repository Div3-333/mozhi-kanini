import React from "react";
import { AnalysisResult, ThemeName, ThemeConfig } from "../types";

interface AnalysisHUDProps {
  analysis: AnalysisResult;
  activeInterpretation: any;
  isHeaderExpanded: boolean;
  setIsHeaderExpanded: (v: boolean) => void;
  activeTab: "matrix" | "syntax" | "stats";
  setActiveTab: (t: "matrix" | "syntax" | "stats") => void;
  theme: ThemeName;
  currentTheme: ThemeConfig;
  deepLoading: boolean;
  onDeepAnalysis: () => void;
  onExportMD: () => void;
  onExportLaTeX: () => void;
}

export const AnalysisHUD: React.FC<AnalysisHUDProps> = ({
  analysis, activeInterpretation, isHeaderExpanded, setIsHeaderExpanded, activeTab, setActiveTab,
  theme, currentTheme, deepLoading, onDeepAnalysis, onExportMD, onExportLaTeX
}) => {
  return (
    <div className={`z-30 border-b border-white/10 ${currentTheme.hud} backdrop-blur-2xl transition-all duration-500 ${isHeaderExpanded ? 'max-h-[50%]' : 'max-h-[220px]'}`}>
      <div className="p-8 h-full flex flex-col">
        <div className="flex justify-between items-start gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-4 mb-3">
              <h2 className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-[0.4em]">Analysis HUD</h2>
              <div className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[8px] font-bold text-indigo-300 uppercase tracking-widest">
                Branch: {activeInterpretation?.name || "None"}
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setActiveTab("matrix")} className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-lg transition-all ${activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'}`}>Matrix</button>
                  <button onClick={() => setActiveTab("syntax")} className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-lg transition-all ${activeTab === 'syntax' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'}`}>Syntax</button>
                  <button onClick={() => setActiveTab("stats")} className={`text-[10px] uppercase tracking-widest font-black px-3 py-1.5 rounded-lg transition-all ${activeTab === 'stats' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-400'}`}>Stats</button>
              </div>
              <button onClick={() => setIsHeaderExpanded(!isHeaderExpanded)} className="text-[10px] text-slate-500 hover:text-indigo-400 uppercase tracking-widest font-black ml-auto">{isHeaderExpanded ? "[ Collapse ]" : "[ Expand Context ]"}</button>
            </div>
            <div className={`font-serif tracking-tight leading-snug mb-6 transition-all ${isHeaderExpanded ? 'text-3xl' : 'text-xl line-clamp-1 opacity-80'} ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>{analysis.text}</div>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-indigo-500/10 border border-indigo-500/30 px-5 py-3.5 rounded-2xl flex items-center gap-4 min-w-0">
                <span className="text-[10px] font-mono text-indigo-400 font-black uppercase tracking-widest">Semantic</span>
                <p className={`text-indigo-50 font-medium italic text-lg ${isHeaderExpanded ? 'whitespace-normal' : 'truncate'}`}>"{analysis.translation}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={onDeepAnalysis} disabled={deepLoading} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-[8px] font-bold text-white uppercase tracking-widest disabled:opacity-50">
                  {deepLoading ? "..." : "Deep"}
                </button>
                <button onClick={onExportMD} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] font-bold text-slate-400 hover:text-white uppercase tracking-widest">MD</button>
                <button onClick={onExportLaTeX} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] font-bold text-slate-400 hover:text-white uppercase tracking-widest">LaTeX</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
