"use client";

import React, { useState, useRef, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { Document, LexiconMap, AnalysisResult, ThemeName, WordBreakdown, Interpretation } from "../types";
import { LANGUAGES, THEMES } from "../constants";
import { Sidebar } from "../components/Sidebar";
import { Library } from "../components/Library";
import { AnalysisHUD } from "../components/AnalysisHUD";
import { MatrixView } from "../components/MatrixView";
import { SyntaxView } from "../components/SyntaxView";
import { EmptyState } from "../components/EmptyState";
import { HoverBubble } from "../components/HoverBubble";

export default function Home() {
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: "error" | "success" } | null>(null);
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
  const [activeTab, setActiveTab] = useState<"matrix" | "syntax" | "stats">("matrix");
  const [theme, setTheme] = useState<ThemeName>("obsidian");
  const [concordanceQuery, setConcordanceQuery] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [transliteratedContent, setTransliteratedContent] = useState<string | null>(null);
  const [displayScript, setDisplayScript] = useState("original");
  const [activeInterpretation, setActiveInterpretation] = useState<Interpretation | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  
  const textRef = useRef<HTMLDivElement>(null);
  const currentTheme = THEMES[theme];

  const showNotification = (message: string, type: "error" | "success" = "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const detectLanguage = async (text: string) => {
    if (text.length < 5) return;
    try {
      const data = await apiFetch("/detect_language", {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      if (data.language && LANGUAGES.some(l => l.value === data.language)) {
        setLanguage(data.language);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (editMode && inputText.length > 20) {
      const timer = setTimeout(() => detectLanguage(inputText), 1000);
      return () => clearTimeout(timer);
    }
  }, [inputText, editMode]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await apiFetch("/projects/1/documents");
      setDocuments(data);
    } catch (e) {
      try {
        await apiFetch("/projects", {
          method: "POST",
          body: JSON.stringify({ name: "Default Project" }),
        });
        const data = await apiFetch("/projects/1/documents");
        setDocuments(data);
      } catch (err) {
        showNotification("Failed to connect to the analysis server.");
      }
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
      const data = await apiFetch("/documents", {
        method: "POST",
        body: JSON.stringify(newDoc),
      });
      setDocuments([data, ...documents]);
      loadDocument(data);
    } catch (e) {
      showNotification("Could not create new document.");
    }
  };

  const loadDocument = (doc: Document) => {
    setActiveDoc(doc);
    setInputText(doc.content);
    setDocTitle(doc.title);
    setLanguage(doc.language);
    setView("editor");
    setAnalysis(null);
    setTransliteratedContent(null);
    setDisplayScript("original");

    if (doc.interpretations && doc.interpretations.length > 0) {
      const latest = doc.interpretations[doc.interpretations.length - 1];
      setActiveInterpretation(latest);
      setLexicon(latest.lexicon_json || {});
      setDocTranslation(latest.doc_translation || "");
      fetchStats(latest.id);
    } else {
      setActiveInterpretation(null);
      setLexicon({});
      setDocTranslation("");
      setStats(null);
    }
  };

  const fetchStats = async (interpId: number) => {
    try {
      const data = await apiFetch(`/interpretations/${interpId}/statistics`);
      setStats(data);
    } catch (e) {}
  };

  const createInterpretation = async (name: string) => {
    if (!activeDoc) return;
    try {
      const newInterp = await apiFetch("/interpretations", {
        method: "POST",
        body: JSON.stringify({
          document_id: activeDoc.id,
          name,
          doc_translation: docTranslation,
          lexicon_json: lexicon
        }),
      });
      const updatedDoc = { ...activeDoc, interpretations: [...activeDoc.interpretations, newInterp] };
      setActiveDoc(updatedDoc);
      setActiveInterpretation(newInterp);
      showNotification(`Branch "${name}" created`, "success");
    } catch (e) {
      showNotification("Failed to create branch");
    }
  };

  const exportCorpus = async () => {
    try {
      const data = await apiFetch("/projects/1/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `drishti-corpus-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      showNotification("Corpus exported successfully", "success");
    } catch (e) {
      showNotification("Export failed");
    }
  };

  const changeScript = async (script: string) => {
    if (script === "original") {
      setTransliteratedContent(null);
      setDisplayScript("original");
      return;
    }
    try {
      const data = await apiFetch("/transliterate", {
        method: "POST",
        body: JSON.stringify({ text: inputText, target_script: script }),
      });
      setTransliteratedContent(data.transliterated_text);
      setDisplayScript(script);
      showNotification(`Script swapped to ${script}`, "success");
    } catch (e) {
      showNotification("Transliteration failed");
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // Rough language mapping for TTS
    const langMap: any = { 'tamil': 'ta-IN', 'hindi': 'hi-IN', 'telugu': 'te-IN', 'malayalam': 'ml-IN', 'kannada': 'kn-IN' };
    utterance.lang = langMap[language] || 'hi-IN';
    window.speechSynthesis.speak(utterance);
  };

  const saveCurrentDoc = async (updates: Partial<Document>) => {
    if (!activeDoc) return;
    try {
      await apiFetch(`/documents/${activeDoc.id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      setActiveDoc({ ...activeDoc, ...updates } as Document);
    } catch (e) {
      console.error("Save failed", e);
    }
  };

  const processEntireDocument = async () => {
    if (!activeDoc) return;
    setLoading(true);
    setProgress(0);
    
    const progressInterval = setInterval(async () => {
      try {
        const data = await apiFetch("/progress");
        setProgress(data.percentage);
      } catch (e) {}
    }, 1000);

    try {
      const data = await apiFetch("/process_document", {
        method: "POST",
        body: JSON.stringify({ text: inputText, language }),
      });
      setLexicon(data.words);
      setDocTranslation(data.document_translation);
      
      await saveCurrentDoc({
        lexicon_json: data.words,
        doc_translation: data.document_translation,
        content: inputText,
        language: language
      });
      showNotification("Document indexed successfully", "success");
    } catch (error) {
      showNotification("Document indexing failed.");
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
      const data = await apiFetch("/analyze", {
        method: "POST",
        body: JSON.stringify({ text: analysis.text, language, context: inputText }),
      });
      setAnalysis(prev => prev ? { 
        ...prev, 
        translation: data.translation,
        breakdown: data.breakdown && data.breakdown.length > 0 ? data.breakdown : prev.breakdown 
      } : null);
    } catch (error) {
      showNotification("Deep analysis failed.");
    } finally {
      setDeepLoading(false);
    }
  };

  const updateLexiconEntry = (word: string, updates: Partial<WordBreakdown>) => {
    const newLexicon = { ...lexicon };
    const cleanWord = word.replace(/[.,!?;:।]/g, "");
    if (newLexicon[word]) {
        newLexicon[word] = { ...newLexicon[word], ...updates };
    } else if (newLexicon[cleanWord]) {
        newLexicon[cleanWord] = { ...newLexicon[cleanWord], ...updates };
    } else {
        newLexicon[word] = { word, transliteration: "", contextual_meaning: "", pos: "", syntax_relation: "", morphemes: [], ...updates } as WordBreakdown;
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
    showNotification("Markdown copied!", "success");
  };

  const exportToLaTeX = () => {
    if (!analysis) return;
    let output = "\\begin{exe}\n  \\ex \\gll ";
    output += analysis.breakdown.map(b => b.word).join(" ") + " \\\\\n";
    output += "       " + analysis.breakdown.map(b => b.transliteration).join(" ") + " \\\\\n";
    output += "       " + analysis.breakdown.map(b => b.morphemes.map(m => m.meaning.replace(/ /g, ".")).join("-")).join(" ") + " \\\\\n";
    output += `  \\trans \`${analysis.translation}'\n\\end{exe}`;
    navigator.clipboard.writeText(output);
    showNotification("LaTeX copied!", "success");
  };

  return (
    <main className={`h-screen ${currentTheme.bg} ${currentTheme.text} flex overflow-hidden font-sans selection:bg-indigo-500/40`}>
      <Sidebar view={view} setView={setView} theme={theme} setTheme={setTheme} onRefreshLibrary={fetchDocuments} />

      {view === "library" ? (
        <div className={`flex-1 ${currentTheme.bg} p-12 overflow-y-auto`}>
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-12">
              <div>
                <h2 className={`text-3xl font-bold tracking-tight ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`}>Project Library</h2>
                <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest font-bold">Research Corpus Index</p>
              </div>
              <div className="flex gap-4">
                <button onClick={exportCorpus} className="px-6 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-full text-xs font-bold uppercase tracking-widest transition-all border border-white/5">Download JSON Corpus</button>
                <button onClick={createNewDoc} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg">New Analysis</button>
              </div>
            </div>
            <Library documents={documents} onCreateNew={createNewDoc} onLoadDoc={loadDocument} theme={theme} currentTheme={currentTheme} />
          </div>
        </div>
      ) : !activeDoc ? (
        <EmptyState 
          currentTheme={currentTheme} 
          onCreateNew={createNewDoc} 
          onGoToLibrary={() => setView("library")} 
        />
      ) : (
        <>
          <div className={`w-[380px] flex-shrink-0 border-r border-white/10 flex flex-col ${currentTheme.panel} z-40 shadow-2xl animate-in fade-in slide-in-from-left duration-500`}>
            <div className={`p-6 border-b border-white/5 ${theme === 'paper' ? 'bg-black/5' : 'bg-black/40'}`}>
              <input value={docTitle} onChange={(e) => { setDocTitle(e.target.value); saveCurrentDoc({ title: e.target.value }); }} className={`bg-transparent border-none font-bold text-sm outline-none w-full mb-4 focus:text-indigo-400 transition-all ${theme === 'paper' ? 'text-slate-800' : 'text-white'}`} />
              <div className="space-y-3">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold uppercase text-slate-400 outline-none">
                  {LANGUAGES.map(lang => (<option key={lang.value} value={lang.value} className="bg-[#121216]">{lang.label}</option>))}
                </select>
                <button onClick={processEntireDocument} disabled={loading || !activeDoc} className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-lg">
                  {loading ? "Analyzing..." : activeDoc ? "Index Document" : "Load Doc First"}
                </button>
                {loading && (<div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div></div>)}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Document Body</h3>
                <button 
                  onClick={() => setEditMode(!editMode)} 
                  className={`px-3 py-1 rounded text-[8px] font-bold uppercase tracking-widest transition-all ${editMode ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  {editMode ? "Save & Lock" : "Edit Text"}
                </button>
              </div>
              
              {editMode ? (
                <textarea
                  value={inputText}
                  onChange={(e) => { setInputText(e.target.value); saveCurrentDoc({ content: e.target.value }); }}
                  className={`flex-1 w-full bg-transparent outline-none text-lg leading-relaxed font-medium resize-none border-none custom-scrollbar ${theme === 'paper' ? 'text-slate-800' : 'text-white/70'}`}
                  placeholder="Paste text here..."
                />
              ) : (
                <div 
                  ref={textRef} 
                  onMouseUp={handleSelection} 
                  className={`outline-none text-lg leading-relaxed font-medium min-h-full whitespace-pre-wrap selection:bg-indigo-500/40 ${theme === 'paper' ? 'text-slate-800' : 'text-white/70'}`}
                >
                  {displayScript !== "original" && transliteratedContent ? transliteratedContent : (concordanceQuery ? renderHighlightedText() : inputText)}
                </div>
              )}
            </div>
          </div>

          <div className={`flex-1 overflow-hidden ${currentTheme.bg} flex flex-col relative`}>
            {analysis ? (
              <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-500">
                <AnalysisHUD 
                  analysis={analysis} 
                  activeInterpretation={activeInterpretation}
                  isHeaderExpanded={isHeaderExpanded} setIsHeaderExpanded={setIsHeaderExpanded}
                  activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} currentTheme={currentTheme}
                  deepLoading={deepLoading} onDeepAnalysis={fetchDeepTranslation} 
                  onExportMD={exportToLeipzigMarkdown} onExportLaTeX={exportToLaTeX}
                />

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                  {activeTab === "matrix" ? (
                    <MatrixView 
                      breakdown={analysis.breakdown} theme={theme} currentTheme={currentTheme}
                      onUpdateLexicon={updateLexiconEntry} onMorphemeEdit={handleMorphemeEdit}
                      onFindConcordance={findConcordance} onSpeak={speakText}
                    />
                  ) : activeTab === "syntax" ? (
                    <SyntaxView breakdown={analysis.breakdown} theme={theme} currentTheme={currentTheme} onUpdateLexicon={updateLexiconEntry} />
                  ) : (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className={`${currentTheme.panel} p-6 rounded-2xl border border-white/5 shadow-xl`}>
                          <h4 className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-4">Lexical Diversity</h4>
                          <div className="text-4xl font-bold">{stats?.total_unique_tokens || 0}</div>
                          <p className="text-slate-500 text-[10px] mt-2 font-mono">Unique Tokens Indexed</p>
                        </div>
                        {/* More stats could go here */}
                      </div>
                      
                      <div className={`${currentTheme.panel} p-8 rounded-2xl border border-white/5`}>
                        <h4 className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-6">POS Distribution</h4>
                        <div className="flex flex-wrap gap-4">
                          {stats?.pos_distribution && Object.entries(stats.pos_distribution).map(([pos, count]: any) => (
                            <div key={pos} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                              <span className="text-xs font-bold text-slate-300">{pos}</span>
                              <span className="text-lg font-black text-indigo-500">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className={`${currentTheme.panel} p-8 rounded-2xl border border-white/5`}>
                        <h4 className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest mb-6">Morphological Complexity</h4>
                        <div className="flex flex-wrap gap-4">
                          {stats?.morpheme_type_distribution && Object.entries(stats.morpheme_type_distribution).map(([type, count]: any) => (
                            <div key={type} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                              <span className="text-[10px] font-mono text-slate-500 uppercase">{type}</span>
                              <span className="text-lg font-black text-indigo-400">{count}</span>
                            </div>
                          ))}
                        </div>
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

      {notification && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-right duration-300 ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-widest uppercase">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="hover:opacity-60">×</button>
          </div>
        </div>
      )}

      {analysis && popoverPosition && (
        <HoverBubble 
          analysis={analysis} 
          position={popoverPosition} 
          onClose={() => { setAnalysis(null); setPopoverPosition(null); }} 
        />
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

