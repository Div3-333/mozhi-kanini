import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import google.generativeai as genai
from googletrans import Translator
from dotenv import load_dotenv
import re
import json
import time
import asyncio

load_dotenv()

GENI_API_KEY = os.getenv("GEMINI_API_KEY")
if GENI_API_KEY and GENI_API_KEY != "your_gemini_api_key_here":
    genai.configure(api_key=GENI_API_KEY)

translator = Translator()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Morpheme(BaseModel):
    text: str
    type: str
    meaning: str
    pos: Optional[str] = None

class WordBreakdown(BaseModel):
    word: str
    transliteration: str
    contextual_meaning: str
    pos: str
    syntax_relation: str
    morphemes: List[Morpheme]

class AnalysisResponse(BaseModel):
    translation: str
    breakdown: List[WordBreakdown]

class AnalysisRequest(BaseModel):
    text: str
    context: Optional[str] = None
    language: Optional[str] = "auto"

class LexiconMap(BaseModel):
    words: Dict[str, WordBreakdown]
    document_translation: str

def get_filtered_models():
    """Finds reliable, fast models only."""
    try:
        models = []
        # Exclude slow/experimental/non-text models
        exclude = ['tts', 'robotics', 'computer-use', 'image', 'clip', 'deep-research', '2.5']
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                if not any(x in m.name.lower() for x in exclude):
                    models.append(m.name)
        
        # Prefer 2.0 Flash and 1.5 Flash
        models.sort(key=lambda x: ('2.0' in x or 'flash' in x), reverse=True)
        return models if models else ['models/gemini-1.5-flash', 'models/gemini-pro-latest']
    except:
        return ['models/gemini-1.5-flash']

async def process_chunk(words_subset: List[str], language: str, full_context: str):
    """Processes a small batch of words to ensure speed and JSON reliability."""
    prompt = f"""
    Linguistic breakdown for {language}.
    Words: {', '.join(words_subset)}
    Full Context: "{full_context[:200]}..."
    
    Return STRICT JSON:
    {{
      "words": {{
        "token": {{
          "word": "token",
          "transliteration": "scientific",
          "contextual_meaning": "meaning in context",
          "pos": "POS",
          "syntax_relation": "role",
          "morphemes": [
            {{ "text": "...", "type": "root/prefix/suffix", "meaning": "...", "pos": "..." }}
          ]
        }}
      }}
    }}
    """
    
    models = get_filtered_models()
    for model_name in models:
        try:
            model = genai.GenerativeModel(model_name, generation_config={"response_mime_type": "application/json"})
            response = await asyncio.to_thread(model.generate_content, prompt)
            return json.loads(response.text)
        except Exception as e:
            print(f"INFO: Chunk failed with {model_name}: {e}")
            continue
    return {"words": {}}

# Global state for progress tracking
processing_progress = {"current": 0, "total": 0}

@app.get("/progress")
async def get_progress():
    if processing_progress["total"] == 0:
        return {"percentage": 0}
    return {"percentage": int((processing_progress["current"] / processing_progress["total"]) * 100)}

@app.post("/process_document", response_model=LexiconMap)
async def process_document(request: AnalysisRequest):
    global processing_progress
    if not GENI_API_KEY or GENI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(status_code=500, detail="API key missing.")
    
    # Reset progress
    processing_progress = {"current": 0, "total": 0}
    
    # 1. Get overall translation fast
    try:
        doc_trans = await translator.translate(request.text, dest='en')
        document_translation = doc_trans.text
    except:
        document_translation = "Translation pending..."

    # 2. Extract unique tokens
    all_tokens = list(set(re.findall(r'[\u0900-\u0DFF\w]+', request.text)))
    all_tokens = [t for t in all_tokens if len(t) > 0]
    
    # 3. Chunk tokens
    chunk_size = 10
    chunks = [all_tokens[i:i + chunk_size] for i in range(0, len(all_tokens), chunk_size)]
    
    processing_progress["total"] = len(chunks)
    print(f"DEBUG: Indexing {len(all_tokens)} unique tokens in {len(chunks)} batches...")
    
    final_lexicon = {}
    for i, chunk in enumerate(chunks):
        processing_progress["current"] = i + 1
        print(f"DEBUG: Processing batch {i+1}/{len(chunks)}...")
        result = await process_chunk(chunk, request.language, request.text)
        if "words" in result:
            final_lexicon.update(result["words"])
        await asyncio.sleep(0.5)
            
    # Reset after completion
    processing_progress = {"current": 0, "total": 0}
    return { "document_translation": document_translation, "words": final_lexicon }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_text(request: AnalysisRequest):
    try:
        lang_map = {'tamil': 'ta', 'malayalam': 'ml', 'hindi': 'hi', 'kannada': 'kn', 'telugu': 'te', 'sanskrit': 'sa'}
        src_lang = lang_map.get(request.language.lower(), 'auto')
        result = await translator.translate(request.text, src=src_lang, dest='en')
        return {"translation": result.text, "breakdown": []}
    except:
        return {"translation": "Translation error", "breakdown": []}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
