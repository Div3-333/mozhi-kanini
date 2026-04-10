import React from "react";
import { WordBreakdown, ThemeName, ThemeConfig } from "../types";

interface MatrixViewProps {
  breakdown: WordBreakdown[];
  theme: ThemeName;
  currentTheme: ThemeConfig;
  onUpdateLexicon: (word: string, updates: Partial<WordBreakdown>) => void;
  onMorphemeEdit: (word: string, mIndex: number, field: string, value: string) => void;
  onFindConcordance: (text: string) => void;
  onSpeak: (text: string) => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  breakdown, theme, currentTheme, onUpdateLexicon, onMorphemeEdit, onFindConcordance, onSpeak
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
      {breakdown.map((word, i) => (
        <div key={i} className={`flex flex-col ${currentTheme.panel} border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group`}>
          <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/5">
            <div className="min-w-0 w-full">
              <div className="flex items-center gap-3">
                <div className={`text-2xl font-bold tracking-tight group-hover:text-indigo-400 transition-colors ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>{word.word}</div>
                <button onClick={() => onSpeak(word.word)} className="p-1 rounded bg-white/5 hover:bg-indigo-500/20 text-slate-500 hover:text-indigo-400 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                </button>
              </div>
              <input value={word.transliteration} onChange={(e) => onUpdateLexicon(word.word, { transliteration: e.target.value })} className="bg-transparent border-none text-xs font-mono text-indigo-400/80 uppercase tracking-widest mt-1 w-full outline-none focus:text-indigo-300" />
            </div>
            <input value={word.pos} onChange={(e) => onUpdateLexicon(word.word, { pos: e.target.value })} className="w-16 bg-white/5 border-none text-[10px] font-black text-slate-500 uppercase text-right rounded px-1 outline-none" />
          </div>
          <div className="space-y-4 mb-6 flex-1">
            {word.morphemes.map((m, mi) => (
              <div key={mi} className="relative pl-6 py-1 group/m">
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500/30"></div><div className="absolute left-0 top-1/2 w-4 h-[2px] bg-indigo-500/30"></div>
                <div className="flex justify-between items-center mb-0.5">
                  <div className="flex items-center gap-2">
                    <input value={m.text} onChange={(e) => onMorphemeEdit(word.word, mi, 'text', e.target.value)} className={`bg-transparent border-none text-base font-bold w-32 outline-none ${theme === 'paper' ? 'text-slate-700' : 'text-slate-200'}`} />
                    <button onClick={() => onFindConcordance(m.text)} className="p-1.5 rounded bg-white/5 hover:bg-indigo-500/20 text-slate-600 hover:text-indigo-400 transition-all opacity-0 group-hover/m:opacity-100">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                  </div>
                  <input value={m.type} onChange={(e) => onMorphemeEdit(word.word, mi, 'type', e.target.value)} className="bg-transparent border-none text-[9px] font-mono text-indigo-500/60 font-bold uppercase tracking-tight w-16 text-right outline-none" />
                </div>
                <input value={m.meaning} onChange={(e) => onMorphemeEdit(word.word, mi, 'meaning', e.target.value)} className="bg-transparent border-none text-xs text-indigo-300 font-medium italic w-full outline-none" />
              </div>
            ))}
          </div>
          <div className="mt-auto">
            <div className="bg-black/40 rounded-xl p-4 border border-white/5">
              <span className="block text-[9px] font-mono text-slate-500 uppercase mb-1 tracking-widest font-bold">Contextual Gloss</span>
              <input value={word.contextual_meaning} onChange={(e) => onUpdateLexicon(word.word, { contextual_meaning: e.target.value })} className="bg-transparent border-none text-sm text-slate-200 font-medium italic w-full outline-none" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
