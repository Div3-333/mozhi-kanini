export interface Morpheme {
  text: string;
  type: string;
  meaning: string;
  pos?: string;
}

export interface WordBreakdown {
  word: string;
  transliteration: string;
  contextual_meaning: string;
  pos: string;
  syntax_relation: string;
  morphemes: Morpheme[];
}

export interface AnalysisResult {
  text: string;
  translation: string;
  breakdown: WordBreakdown[];
}

export interface LexiconMap {
  [key: string]: WordBreakdown;
}

export interface Interpretation {
  id: number;
  document_id: number;
  name: string;
  doc_translation: string;
  lexicon_json: LexiconMap;
}

export interface Document {
  id: number;
  project_id: number;
  title: string;
  content: string;
  language: string;
  created_at: any;
  lexicon_json?: LexiconMap;
  doc_translation?: string;
  interpretations: Interpretation[];
}

export type ThemeName = "obsidian" | "paper" | "slate";

export interface ThemeConfig {
  bg: string;
  text: string;
  panel: string;
  hud: string;
}
