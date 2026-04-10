import React from "react";
import { WordBreakdown, ThemeName, ThemeConfig } from "../types";

interface SyntaxViewProps {
  breakdown: WordBreakdown[];
  theme: ThemeName;
  currentTheme: ThemeConfig;
  onUpdateLexicon: (word: string, updates: Partial<WordBreakdown>) => void;
}

export const SyntaxView: React.FC<SyntaxViewProps> = ({ breakdown, theme, currentTheme, onUpdateLexicon }) => {
  return (
    <div className="flex flex-col items-center gap-12 py-10">
      <div className="flex flex-wrap justify-center gap-x-12 gap-y-24 max-w-5xl">
        {breakdown.map((word, i) => (
          <div key={i} className="relative group/s">
            <div className="flex flex-col items-center">
              <div className={`px-4 py-2 rounded-xl ${currentTheme.panel} border border-indigo-500/30 shadow-xl relative z-10`}>
                <div className={`text-xl font-bold ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>{word.word}</div>
                <div className="text-[8px] font-mono text-indigo-400 uppercase tracking-tighter">{word.pos}</div>
              </div>
              <div className="mt-4 flex flex-col items-center">
                <div className="w-[1px] h-8 bg-indigo-500/30"></div>
                <input 
                  value={word.syntax_relation} 
                  onChange={(e) => onUpdateLexicon(word.word, { syntax_relation: e.target.value })} 
                  className="text-[10px] font-mono text-indigo-500/60 uppercase tracking-[0.2em] bg-black/20 px-3 py-1 rounded-full border border-indigo-500/10 text-center outline-none focus:text-indigo-400" 
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
