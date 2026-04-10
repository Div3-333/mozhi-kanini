"use client";

import React, { useState, useRef, useEffect } from "react";

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

interface Document {
  id: number;
  title: string;
  content: string;
  language: string;
  doc_translation: string;
  lexicon_json: LexiconMap;
}

export default function Home() {
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [inputText, setInputText] = useState("यो मरणान्नोद्विजते स एव वीरोऽत्र जेष्यति।");
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [lexicon, setLexicon] = useState<LexiconMap>({});
  const [docTranslation, setDocTranslation] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deepLoading, setDeepLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [language, setLanguage] = useState("sanskrit");
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [view, setView] = useState<"editor" | "library">("editor");
  const [activeTab, setActiveTab] = useState<"matrix" | "syntax">("matrix");
  const [theme, setTheme] = useState<"obsidian" | "paper" | "slate">("obsidian");
  const [concordanceQuery, setConcordanceQuery] = useState<string | null>(null);
  
  const textRef = useRef<HTMLDivElement>(null);

  const languages = [
    { label: "Sanskrit", value: "sanskrit" },
    { label: "Tamil", value: "tamil" },
    { label: "Malayalam", value: "malayalam" },
    { label: "Kannada", value: "kannada" },
    { label: "Telugu", value: "telugu" },
    { label: "Hindi", value: "hindi" },
  ];

  const themes = {
    obsidian: { bg: "bg-[#050507]", text: "text-slate-300", panel: "bg-[#08080a]", hud: "bg-black/60" },
    paper: { bg: "bg-[#f4f1ea]", text: "text-slate-800", panel: "bg-[#fffdfa]", hud: "bg-white/80" },
    slate: { bg: "bg-[#0f172a]", text: "text-slate-200", panel: "bg-[#1e293b]", hud: "bg-[#0f172a]/80" }
  };

  const currentTheme = themes[theme];

  // --- Persistence Logic ---

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/projects/1/documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        await fetch("http://127.0.0.1:8000/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Default Project" }),
        });
      }
    } catch (e) {
      console.error("Failed to fetch docs", e);
    }
  };

  const createNewDoc = async () => {
    const newDoc = {
      title: "New Analysis " + new Date().toLocaleTimeString(),
      content: "Paste text here...",
      language: "sanskrit",
      project_id: 1
    };
    try {
      const res = await fetch("http://127.0.0.1:8000/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDoc),
      });
      const data = await res.json();
      setDocuments([data, ...documents]);
      loadDocument(data);
    } catch (e) {}
  };

  const loadDocument = (doc: Document) => {
    setActiveDoc(doc);
    setInputText(doc.content);
    setDocTitle(doc.title);
    setLexicon(doc.lexicon_json || {});
    setDocTranslation(doc.doc_translation || "");
    setLanguage(doc.language);
    setView("editor");
    setAnalysis(null);
  };

  const saveCurrentDoc = async (updates: Partial<Document>) => {
    if (!activeDoc) return;
    try {
      await fetch(`http://127.0.0.1:8000/documents/${activeDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setActiveDoc({ ...activeDoc, ...updates } as Document);
    } catch (e) {}
  };

  // --- Analysis Logic ---

  const processEntireDocument = async () => {
    if (!activeDoc) return;
    setLoading(true);
    setProgress(0);
    
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
      
      await saveCurrentDoc({
        lexicon_json: data.words,
        doc_translation: data.document_translation,
        content: inputText,
        language: language
      });

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
      const instantTranslation = breakdown.map(b => b.contextual_meaning).filter(m => m !== "Unanalyzed").join(" ");
      setAnalysis({ text: selectedStr, translation: instantTranslation || "Selection active.", breakdown: breakdown });
      setIsHeaderExpanded(false);
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

  // --- Annotation Edits ---

  const updateLexiconEntry = (word: string, updates: Partial<WordBreakdown>) => {
    const newLexicon = { ...lexicon };
    const cleanWord = word.replace(/[.,!?;:।]/g, "");
    if (newLexicon[word]) {
        newLexicon[word] = { ...newLexicon[word], ...updates };
    } else if (newLexicon[cleanWord]) {
        newLexicon[cleanWord] = { ...newLexicon[cleanWord], ...updates };
    } else {
        newLexicon[word] = { word, transliteration: "", contextual_meaning: "", pos: "", syntax_relation: "", morphemes: [], ...updates };
    }
    setLexicon(newLexicon);
    saveCurrentDoc({ lexicon_json: newLexicon });
    
    if (analysis) {
        const newBreakdown = analysis.breakdown.map(b => 
            (b.word === word || b.word.replace(/[.,!?;:।]/g, "") === cleanWord) 
            ? { ...b, ...updates } as WordBreakdown : b
        );
        setAnalysis({ ...analysis, breakdown: newBreakdown });
    }
  };

  const handleMorphemeEdit = (word: string, mIndex: number, field: string, value: string) => {
    const entry = lexicon[word] || lexicon[word.replace(/[.,!?;:।]/g, "")];
    if (!entry) return;
    const newMorphemes = [...entry.morphemes];
    newMorphemes[mIndex] = { ...newMorphemes[mIndex], [field]: value };
    updateLexiconEntry(word, { morphemes: newMorphemes });
  };

  const [concordanceQuery, setConcordanceQuery] = useState<string | null>(null);

  const findConcordance = (morphemeText: string) => {
    setConcordanceQuery(null);
    const normalized = morphemeText.normalize("NFC");
    setTimeout(() => setConcordanceQuery(normalized), 10);
  };

  const renderHighlightedText = () => {
    if (!concordanceQuery) return inputText;
    const tokens = inputText.split(/(\s+|[.,!?;:।])/g);
    return tokens.map((token, i) => {
        const cleanToken = token.trim().replace(/[.,!?;:।]/g, "").normalize("NFC");
        if (!cleanToken) return token;

        const entry = lexicon[token.trim()] || lexicon[cleanToken];
        const isMatch = entry && entry.morphemes.some(m => 
            m.text.normalize("NFC") === concordanceQuery
        );

        if (isMatch) {
            return <span key={i} className="bg-indigo-500/40 text-white rounded px-0.5 border-b-2 border-indigo-400 animate-pulse">{token}</span>;
        }
        return token;
    });
  };

  // --- Export Logic ---

  const exportToLeipzigMarkdown = () => {
    if (!analysis) return;
    let output = "### Interlinear Gloss\n\n";
    const rows = [
        analysis.breakdown.map(b => b.word),
        analysis.breakdown.map(b => b.transliteration),
        analysis.breakdown.map(b => b.morphemes.map(m => m.meaning.replace(/ /g, ".")).join("-")),
        analysis.breakdown.map(b => b.pos)
    ];
    rows.forEach(row => { output += row.join("\t") + "  \n"; });
    output += `\n*${analysis.translation}*\n`;
    navigator.clipboard.writeText(output);
    alert("Leipzig Markdown copied to clipboard!");
  };

  const exportToLaTeX = () => {
    if (!analysis) return;
    let output = "\\begin{exe}\n  \\ex \\gll ";
    output += analysis.breakdown.map(b => b.word).join(" ") + " \\\\\n";
    output += "       " + analysis.breakdown.map(b => b.transliteration).join(" ") + " \\\\\n";
    output += "       " + analysis.breakdown.map(b => b.morphemes.map(m => m.meaning.replace(/ /g, ".")).join("-")).join(" ") + " \\\\\n";
    output += `  \\trans \`${analysis.translation}'\n\\end{exe}`;
    navigator.clipboard.writeText(output);
    alert("LaTeX (gb4e) copied to clipboard!");
  };

  return (
    <main className={`h-screen ${currentTheme.bg} ${currentTheme.text} flex overflow-hidden font-sans selection:bg-indigo-500/40`}>
      
      {/* NAVIGATION RAIL */}
      <div className="w-16 flex-shrink-0 bg-black border-r border-white/5 flex flex-col items-center py-8 gap-8 z-50">
        <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center cursor-pointer" onClick={() => setView("editor")}>
          <span className="text-white font-bold text-lg italic">D</span>
        </div>
        <button onClick={() => setView("editor")} className={`p-2 rounded-lg transition-all ${view === 'editor' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button onClick={() => { fetchDocuments(); setView("library"); }} className={`p-2 rounded-lg transition-all ${view === 'library' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
        </button>
        <div className="mt-auto flex flex-col gap-4">
            {(Object.keys(themes) as (keyof typeof themes)[]).map(t => (
                <div key={t} onClick={() => setTheme(t)} className={`w-4 h-4 rounded-full cursor-pointer border-2 ${theme === t ? 'border-indigo-500' : 'border-white/10'} ${themes[t].bg}`} />
            ))}
        </div>
      </div>

      {view === "library" ? (
        <div className={`flex-1 ${currentTheme.bg} p-12 overflow-y-auto`}>
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-12">
              <h2 className={`text-3xl font-bold tracking-tight ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>Project Library</h2>
              <button onClick={createNewDoc} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg">New Analysis</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map(doc => (
                <div key={doc.id} onClick={() => loadDocument(doc)} className={`${currentTheme.panel} border border-white/5 p-6 rounded-2xl cursor-pointer hover:border-indigo-500/40 transition-all group`}>
                  <div className="text-[10px] font-mono text-indigo-500 uppercase mb-2 tracking-widest">{doc.language}</div>
                  <h3 className={`text-xl font-bold mb-4 group-hover:text-indigo-400 ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>{doc.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2 italic mb-6">"{doc.content}"</p>
                  <div className="text-[9px] font-mono text-slate-700 uppercase">{Object.keys(doc.lexicon_json || {}).length} Tokens Indexed</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={`w-[380px] flex-shrink-0 border-r border-white/10 flex flex-col ${currentTheme.panel} z-40 shadow-2xl`}>
            <div className={`p-6 border-b border-white/5 ${theme === 'paper' ? 'bg-black/5' : 'bg-black/40'}`}>
              <input value={docTitle} onChange={(e) => { setDocTitle(e.target.value); saveCurrentDoc({ title: e.target.value }); }} className={`bg-transparent border-none font-bold text-sm outline-none w-full mb-4 focus:text-indigo-400 transition-all ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`} />
              <div className="space-y-3">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold uppercase text-slate-400 outline-none">
                  {languages.map(lang => (<option key={lang.value} value={lang.value} className="bg-[#121216]">{lang.label}</option>))}
                </select>
                <button onClick={processEntireDocument} disabled={loading || !activeDoc} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-lg">
                  {loading ? "Analyzing..." : activeDoc ? "Index Document" : "Load Doc First"}
                </button>
                {loading && (<div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>)}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
              {concordanceQuery && (<div className="absolute top-2 right-2 z-10"><button onClick={() => setConcordanceQuery(null)} className="text-[8px] bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20 font-bold uppercase tracking-widest">Clear</button></div>)}
              <div ref={textRef} contentEditable suppressContentEditableWarning onMouseUp={handleSelection} className={`outline-none text-lg leading-relaxed font-medium min-h-full whitespace-pre-wrap ${theme === 'paper' ? 'text-slate-800' : 'text-white/70'}`} onInput={(e) => { setInputText(e.currentTarget.innerText); saveCurrentDoc({ content: e.currentTarget.innerText }); }}>
                {concordanceQuery ? renderHighlightedText() : inputText}
              </div>
            </div>
          </div>

          <div className={`flex-1 overflow-hidden ${currentTheme.bg} flex flex-col relative`}>
            {analysis ? (
              <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500">
                <div className={`z-30 border-b border-white/10 ${currentTheme.hud} backdrop-blur-2xl transition-all duration-500 ${isHeaderExpanded ? 'max-h-[50%]' : 'max-h-[220px]'}`}>
                  <div className="p-8 h-full flex flex-col">
                    <div className="flex justify-between items-start gap-8">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-2">
                          <h2 className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-[0.4em]">Analysis HUD</h2>
                          <div className="flex gap-2">
                              <button onClick={() => setActiveTab("matrix")} className={`text-[8px] uppercase tracking-widest font-bold px-2 py-1 rounded ${activeTab === 'matrix' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-indigo-400'}`}>Matrix</button>
                              <button onClick={() => setActiveTab("syntax")} className={`text-[8px] uppercase tracking-widest font-bold px-2 py-1 rounded ${activeTab === 'syntax' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-indigo-400'}`}>Syntax</button>
                          </div>
                          <button onClick={() => setIsHeaderExpanded(!isHeaderExpanded)} className="text-[8px] text-slate-500 hover:text-indigo-400 uppercase tracking-widest font-bold ml-auto">{isHeaderExpanded ? "[ Collapse ]" : "[ Expand Context ]"}</button>
                        </div>
                        <div className={`font-serif tracking-tight leading-snug mb-4 transition-all ${isHeaderExpanded ? 'text-2xl' : 'text-lg line-clamp-1 opacity-60'} ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>{analysis.text}</div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-indigo-500/5 border border-indigo-500/20 px-4 py-2.5 rounded-xl flex items-center gap-3 min-w-0"><span className="text-[8px] font-mono text-indigo-500 font-bold uppercase">Semantic</span><p className={`text-indigo-100 font-light italic truncate flex-1 ${isHeaderExpanded ? 'whitespace-normal' : 'truncate'}`}>"{analysis.translation}"</p></div>
                          <div className="flex gap-2"><button onClick={exportToLeipzigMarkdown} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] font-bold text-slate-400 hover:text-white uppercase tracking-widest">MD</button><button onClick={exportToLaTeX} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[8px] font-bold text-slate-400 hover:text-white uppercase tracking-widest">LaTeX</button></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                  {activeTab === "matrix" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {analysis.breakdown.map((word, i) => (
                        <div key={i} className={`flex flex-col ${currentTheme.panel} border border-white/5 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group`}>
                            <div className="flex justify-between items-start mb-4 pb-4 border-b border-white/5">
                            <div className="min-w-0 w-full">
                                <div className={`text-xl font-bold tracking-tight group-hover:text-indigo-400 transition-colors ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>{word.word}</div>
                                <input value={word.transliteration} onChange={(e) => updateLexiconEntry(word.word, { transliteration: e.target.value })} className="bg-transparent border-none text-[10px] font-mono text-indigo-400/60 uppercase tracking-widest mt-1 w-full outline-none focus:text-indigo-300" />
                            </div>
                            <input value={word.pos} onChange={(e) => updateLexiconEntry(word.word, { pos: e.target.value })} className="w-12 bg-white/5 border-none text-[8px] font-black text-slate-500 uppercase text-right rounded px-1 outline-none" />
                            </div>
                            <div className="space-y-4 mb-6 flex-1">
                            {word.morphemes.map((m, mi) => (
                                <div key={mi} className="relative pl-5 py-0.5 group/m">
                                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-indigo-500/20"></div><div className="absolute left-0 top-1/2 w-3 h-[1px] bg-indigo-500/20"></div>
                                <div className="flex justify-between items-center mb-0.5">
                                    <div className="flex items-center gap-2"><input value={m.text} onChange={(e) => handleMorphemeEdit(word.word, mi, 'text', e.target.value)} className={`bg-transparent border-none text-sm font-bold w-24 outline-none ${theme === 'paper' ? 'text-slate-700' : 'text-slate-200'}`} /><button onClick={() => findConcordance(m.text)} className="p-1 rounded bg-white/5 hover:bg-indigo-500/20 text-slate-600 hover:text-indigo-400 transition-all opacity-0 group-hover/m:opacity-100"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></button></div>
                                    <input value={m.type} onChange={(e) => handleMorphemeEdit(word.word, mi, 'type', e.target.value)} className="bg-transparent border-none text-[7px] font-mono text-indigo-500/40 uppercase tracking-tighter w-12 text-right outline-none" />
                                </div>
                                <input value={m.meaning} onChange={(e) => handleMorphemeEdit(word.word, mi, 'meaning', e.target.value)} className="bg-transparent border-none text-[10px] text-indigo-300/70 font-medium italic w-full outline-none" />
                                </div>
                            ))}
                            </div>
                            <div className="mt-auto"><div className="bg-black/40 rounded-xl p-3 border border-white/5"><span className="block text-[7px] font-mono text-slate-600 uppercase mb-1 tracking-widest">Contextual Gloss</span><input value={word.contextual_meaning} onChange={(e) => updateLexiconEntry(word.word, { contextual_meaning: e.target.value })} className="bg-transparent border-none text-xs text-slate-300 font-medium italic w-full outline-none" /></div></div>
                        </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-12 py-10">
                        <div className="flex flex-wrap justify-center gap-x-12 gap-y-24 max-w-5xl">
                            {analysis.breakdown.map((word, i) => (
                                <div key={i} className="relative group/s">
                                    <div className="flex flex-col items-center">
                                        <div className={`px-4 py-2 rounded-xl ${currentTheme.panel} border border-indigo-500/30 shadow-xl relative z-10`}>
                                            <div className={`text-xl font-bold ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>{word.word}</div>
                                            <div className="text-[8px] font-mono text-indigo-400 uppercase tracking-tighter">{word.pos}</div>
                                        </div>
                                        <div className="mt-4 flex flex-col items-center">
                                            <div className="w-[1px] h-8 bg-indigo-500/30"></div>
                                            <input value={word.syntax_relation} onChange={(e) => updateLexiconEntry(word.word, { syntax_relation: e.target.value })} className="text-[10px] font-mono text-indigo-500/60 uppercase tracking-[0.2em] bg-black/20 px-3 py-1 rounded-full border border-indigo-500/10 text-center outline-none focus:text-indigo-400" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-40">
                <div className="w-24 h-24 border border-white/5 bg-white/[0.01] rounded-3xl flex items-center justify-center mb-10"><svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                <h2 className="text-white font-bold tracking-[0.8em] text-[10px] uppercase mb-4">Matrix Standby</h2>
                <p className="max-w-xs text-slate-500 text-sm font-light">Select any linguistic sequence to initialize deconstruction.</p>
              </div>
            )}
          </div>
        </>
      )}

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
