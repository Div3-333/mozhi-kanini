"use client";

import React, { useState, useRef } from "react";

interface Morpheme {
  text: string;
  type: string;
  meaning: string;
  pos?: string;
}

interface WordBreakdown {
  word: string;
  transliteration: string;
  contextual_meaning: string;
  pos: string;
  syntax_relation: string;
  morphemes: Morpheme[];
}

interface AnalysisResult {
  text: string;
  translation: string;
  breakdown: WordBreakdown[];
}

interface LexiconMap {
  [key: string]: WordBreakdown;
}

export default function Home() {
  const [inputText, setInputText] = useState("यो मरणान्नोद्विजते स एव वीरोऽत्र जेष्यति।");
  const [lexicon, setLexicon] = useState<LexiconMap>({});
  const [docTranslation, setDocTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deepLoading, setDeepLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [language, setLanguage] = useState("sanskrit");
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const languages = [
    { label: "Sanskrit", value: "sanskrit" },
    { label: "Tamil", value: "tamil" },
    { label: "Malayalam", value: "malayalam" },
    { label: "Kannada", value: "kannada" },
    { label: "Telugu", value: "telugu" },
    { label: "Hindi", value: "hindi" },
  ];

  const processEntireDocument = async () => {
    setLoading(true);
    setProgress(0);
    setAnalysis(null);
    
    // Start polling progress
    const progressInterval = setInterval(async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/progress");
        const data = await res.json();
        setProgress(data.percentage);
      } catch (e) {}
    }, 1000);

    try {
      const response = await fetch("http://127.0.0.1:8000/process_document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText, language }),
      });
      if (!response.ok) throw new Error("Processing failed");
      const data = await response.json();
      setLexicon(data.words);
      setDocTranslation(data.document_translation);
    } catch (error) {
      console.error("Doc processing failed", error);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(100);
    }
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    const selectedStr = selection?.toString().trim();
    
    if (selection && selectedStr && selectedStr.length > 0) {
      const words = selectedStr.split(/(\s+)/).filter(s => s.trim().length > 0);
      
      const breakdown = words.map(w => {
          const cleanW = w.replace(/[.,!?;:।]/g, "");
          return lexicon[w] || lexicon[cleanW] || { 
            word: w, 
            transliteration: "...",
            pos: "???",
            syntax_relation: "Unanalyzed",
            contextual_meaning: "Unanalyzed",
            morphemes: [] 
          };
      });

      const instantTranslation = breakdown
        .map(b => b.contextual_meaning)
        .filter(m => m !== "Unanalyzed")
        .join(" ");

      setAnalysis({
        text: selectedStr,
        translation: instantTranslation || "Selection active.",
        breakdown: breakdown
      });
      setIsHeaderExpanded(false); // Reset header on new selection
    }
  };

  const fetchDeepTranslation = async () => {
    if (!analysis?.text) return;
    setDeepLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: analysis.text, language, context: inputText }),
      });
      const data = await response.json();
      setAnalysis(prev => prev ? { ...prev, translation: data.translation } : null);
    } catch (error) {
      console.error("Deep translation failed", error);
    } finally {
      setDeepLoading(false);
    }
  };

  return (
    <main className="h-screen bg-[#050507] text-slate-300 flex overflow-hidden font-sans selection:bg-indigo-500/40">
      
      {/* LEFT PANE: Stable Editor Sidebar */}
      <div className="w-[380px] flex-shrink-0 border-r border-white/5 flex flex-col bg-[#08080a] z-40 shadow-2xl">
        <div className="p-6 border-b border-white/5 bg-black/40">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs italic">D</span>
            </div>
            <h1 className="text-white font-bold tracking-[0.2em] text-[10px] uppercase">Drishti Scholar</h1>
          </div>
          
          <div className="space-y-3">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 outline-none"
            >
              {languages.map(lang => (
                <option key={lang.value} value={lang.value} className="bg-[#121216]">{lang.label}</option>
              ))}
            </select>
            <button 
              onClick={processEntireDocument}
              disabled={loading}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/10"
            >
              {loading ? "Analyzing..." : "Index Document"}
            </button>
            {loading && (
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            </div>

        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div 
            ref={textRef}
            contentEditable
            suppressContentEditableWarning
            onMouseUp={handleSelection}
            className="outline-none text-lg leading-relaxed text-white/70 font-medium min-h-full whitespace-pre-wrap"
            onInput={(e) => setInputText(e.currentTarget.innerText)}
          >
            {inputText}
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20 text-[8px] font-mono text-slate-600 uppercase tracking-widest flex justify-between">
          <span>Neural Hub v5.0</span>
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${Object.keys(lexicon).length > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500'}`}></span>
            {Object.keys(lexicon).length} Indexed
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Dominant Analysis HUD & Grid */}
      <div className="flex-1 overflow-hidden bg-[#0a0a0f] flex flex-col relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/[0.03] via-transparent to-transparent pointer-events-none"></div>
        
        {analysis ? (
          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500">
            
            {/* COMPACT STICKY HUD */}
            <div className={`z-30 border-b border-white/10 bg-black/60 backdrop-blur-2xl transition-all duration-500 ease-in-out ${isHeaderExpanded ? 'max-h-[50%]' : 'max-h-[180px]'}`}>
              <div className="p-8 h-full flex flex-col">
                <div className="flex justify-between items-start gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-2">
                      <h2 className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-[0.4em]">Selection Summary</h2>
                      <button 
                        onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                        className="text-[8px] text-slate-500 hover:text-indigo-400 uppercase tracking-widest font-bold"
                      >
                        {isHeaderExpanded ? "[ Collapse ]" : "[ Expand Context ]"}
                      </button>
                    </div>
                    
                    <div className={`text-white font-serif tracking-tight leading-snug mb-4 transition-all ${isHeaderExpanded ? 'text-2xl' : 'text-lg line-clamp-1 opacity-60'}`}>
                      {analysis.text}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-indigo-500/5 border border-indigo-500/20 px-4 py-2.5 rounded-xl flex items-center gap-3 min-w-0">
                        <span className="text-[8px] font-mono text-indigo-500 font-bold uppercase">Semantic</span>
                        <p className={`text-indigo-100 font-light italic truncate flex-1 ${isHeaderExpanded ? 'whitespace-normal' : 'truncate'}`}>
                          "{analysis.translation}"
                        </p>
                      </div>
                      
                      <button 
                        onClick={fetchDeepTranslation}
                        disabled={deepLoading}
                        className="flex-shrink-0 px-4 py-2 rounded-lg bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                        {deepLoading ? "Processing..." : "Deep Translate"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* THE MATRIX: Independent Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-transparent">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-[1px] flex-1 bg-white/5"></div>
                <h3 className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-[0.5em]">Morphological Matrix</h3>
                <div className="h-[1px] flex-1 bg-white/5"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {analysis.breakdown.map((word, i) => (
                  <div key={i} className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all duration-300 group">
                    
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/5">
                      <div className="min-w-0">
                        <div className="text-xl font-bold text-white tracking-tight group-hover:text-indigo-400 transition-colors truncate">{word.word}</div>
                        <div className="text-[10px] font-mono text-indigo-400/60 uppercase tracking-widest mt-1 truncate">{word.transliteration}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[8px] font-black text-slate-500 uppercase">{word.pos}</span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6 flex-1">
                      {word.morphemes.map((m, mi) => (
                        <div key={mi} className="relative pl-5 py-0.5">
                          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-indigo-500/20"></div>
                          <div className="absolute left-0 top-1/2 w-3 h-[1px] bg-indigo-500/20"></div>
                          
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-sm font-bold text-slate-200">{m.text}</span>
                            <span className="text-[7px] font-mono text-indigo-500/40 uppercase tracking-tighter">{m.type}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium italic">{m.meaning}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto">
                       <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                          <span className="block text-[7px] font-mono text-slate-600 uppercase mb-1 tracking-widest">Inflected Meaning</span>
                          <p className="text-xs text-slate-300 font-medium leading-relaxed italic truncate group-hover:whitespace-normal transition-all" title={word.contextual_meaning}>
                            "{word.contextual_meaning}"
                          </p>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-20"></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-40">
            <div className="w-24 h-24 border border-white/5 bg-white/[0.01] rounded-3xl flex items-center justify-center mb-10">
              <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-white font-bold tracking-[0.8em] text-[10px] uppercase mb-4">Matrix Standby</h2>
            <p className="max-w-xs text-slate-500 text-sm font-light">Select any linguistic sequence to initialize deconstruction.</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.2); }
        [contenteditable] { overflow-wrap: break-word; }
      `}</style>
    </main>
  );
}
