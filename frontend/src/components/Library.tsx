import React from "react";
import { Document, ThemeName, ThemeConfig } from "../types";

interface LibraryProps {
  documents: Document[];
  onCreateNew: () => void;
  onLoadDoc: (doc: Document) => void;
  theme: ThemeName;
  currentTheme: ThemeConfig;
}

export const Library: React.FC<LibraryProps> = ({ documents, onCreateNew, onLoadDoc, theme, currentTheme }) => {
  return (
    <div className={`flex-1 ${currentTheme.bg} p-12 overflow-y-auto`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h2 className={`text-3xl font-bold tracking-tight ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>Project Library</h2>
          <button onClick={onCreateNew} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg">New Analysis</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map(doc => (
            <div key={doc.id} onClick={() => onLoadDoc(doc)} className={`${currentTheme.panel} border border-white/5 p-6 rounded-2xl cursor-pointer hover:border-indigo-500/40 transition-all group`}>
              <div className="text-[10px] font-mono text-indigo-500 uppercase mb-2 tracking-widest">{doc.language}</div>
              <h3 className={`text-xl font-bold mb-4 group-hover:text-indigo-400 ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>{doc.title}</h3>
              <p className="text-slate-500 text-sm line-clamp-2 italic mb-6">"{doc.content}"</p>
              <div className="text-[9px] font-mono text-slate-700 uppercase">{Object.keys(doc.lexicon_json || {}).length} Tokens Indexed</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
