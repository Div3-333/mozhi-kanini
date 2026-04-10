import React from "react";
import { AnalysisResult } from "../types";

interface HoverBubbleProps {
  analysis: AnalysisResult;
  position: { top: number; left: number };
  onClose: () => void;
}

export const HoverBubble: React.FC<HoverBubbleProps> = ({ analysis, position, onClose }) => {
  return (
    <div 
      className="fixed z-[60] bg-[#121216] border border-indigo-500/30 shadow-2xl rounded-2xl p-4 w-64 animate-in fade-in zoom-in duration-200"
      style={{ top: position.top - 10, left: position.left, transform: 'translate(-50%, -100%)' }}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">Selection</h4>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">×</button>
      </div>
      <p className="text-white font-serif text-sm mb-3 leading-snug">{analysis.text}</p>
      <div className="bg-white/5 rounded-lg p-2 mb-3">
        <p className="text-indigo-200 text-[11px] italic leading-tight">"{analysis.translation}"</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {analysis.breakdown.slice(0, 3).map((b, i) => (
          <div key={i} className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] text-indigo-300">
            {b.word}: {b.pos}
          </div>
        ))}
        {analysis.breakdown.length > 3 && <div className="text-[9px] text-slate-500 mt-1">+{analysis.breakdown.length - 3} more</div>}
      </div>
      <div className="mt-4 pt-3 border-t border-white/5 text-center text-[8px] text-slate-500 font-bold uppercase tracking-widest">
        Full details in HUD
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#121216]"></div>
    </div>
  );
};
