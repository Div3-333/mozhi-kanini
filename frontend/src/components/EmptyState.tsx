import React from "react";
import { ThemeConfig } from "../types";

interface EmptyStateProps {
  onCreateNew: () => void;
  onGoToLibrary: () => void;
  currentTheme: ThemeConfig;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateNew, onGoToLibrary, currentTheme }) => {
  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-20 text-center ${currentTheme.bg}`}>
      <div className="w-32 h-32 bg-indigo-500/10 rounded-full flex items-center justify-center mb-10 animate-pulse">
        <svg className="w-12 h-12 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold mb-4">Start Your Linguistic Analysis</h2>
      <p className="max-w-md text-slate-500 mb-12 leading-relaxed">
        Drishti helps you deconstruct agglutinative languages. Create a new document or pick one from your library to begin.
      </p>
      <div className="flex gap-4">
        <button 
          onClick={onCreateNew}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all shadow-xl hover:scale-105 active:scale-95"
        >
          Create New Document
        </button>
        <button 
          onClick={onGoToLibrary}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full font-bold transition-all"
        >
          Open Library
        </button>
      </div>
    </div>
  );
};
