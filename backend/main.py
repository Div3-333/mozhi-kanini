import os
from fastapi import FastAPI, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import google.generativeai as genai
from googletrans import Translator
from dotenv import load_dotenv
import re
import json
import time
import asyncio
from sqlalchemy.orm import Session
import database as db_module

load_dotenv()

# Initialize DB
db_module.init_db()

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

# --- Pydantic Models for DB ---
class ProjectBase(BaseModel):
    name: str

class ProjectCreate(ProjectBase):
    pass

class ProjectSchema(ProjectBase):
    id: int
    created_at: Any
    class Config:
        from_attributes = True

class InterpretationBase(BaseModel):
    name: str
    doc_translation: str
    lexicon_json: Dict[str, Any]

class InterpretationCreate(InterpretationBase):
    document_id: int

class InterpretationSchema(InterpretationBase):
    id: int
    document_id: int
    created_at: Any
    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    title: str
    content: str
    language: str
    doc_translation: Optional[str] = None
    lexicon_json: Optional[Dict[str, Any]] = None

class DocumentCreate(DocumentBase):
    project_id: int

class DocumentSchema(DocumentBase):
    id: int
    project_id: int
    created_at: Any
    interpretations: List[InterpretationSchema] = []
    class Config:
        from_attributes = True

# --- Linguistic Models ---
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

# --- DB Dependency ---
def get_db():
    db = db_module.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- DB Endpoints ---

@app.get("/projects", response_model=List[ProjectSchema])
def list_projects(db: Session = Depends(get_db)):
    return db.query(db_module.Project).all()

@app.post("/projects", response_model=ProjectSchema)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    db_project = db_module.Project(name=project.name)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.get("/projects/{project_id}/documents", response_model=List[DocumentSchema])
def list_documents(project_id: int, db: Session = Depends(get_db)):
    return db.query(db_module.Document).filter(db_module.Document.project_id == project_id).all()

@app.get("/projects/{project_id}/export")
def export_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(db_module.Project).filter(db_module.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@app.post("/documents", response_model=DocumentSchema)
def create_document(doc: DocumentCreate, db: Session = Depends(get_db)):
    db_doc = db_module.Document(**doc.dict())
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.put("/documents/{doc_id}", response_model=DocumentSchema)
def update_document(doc_id: int, doc_update: Dict[str, Any], db: Session = Depends(get_db)):
    db_doc = db.query(db_module.Document).filter(db_module.Document.id == doc_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    for key, value in doc_update.items():
        setattr(db_doc, key, value)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.post("/interpretations", response_model=InterpretationSchema)
def create_interpretation(interp: InterpretationCreate, db: Session = Depends(get_db)):
    db_interp = db_module.Interpretation(**interp.dict())
    db.add(db_interp)
    db.commit()
    db.refresh(db_interp)
    return db_interp

@app.get("/interpretations/{interp_id}/statistics")
def get_statistics(interp_id: int, db: Session = Depends(get_db)):
    interp = db.query(db_module.Interpretation).filter(db_module.Interpretation.id == interp_id).first()
    if not interp:
        # Fallback to document stats if no interpretation is found (some old logic might use this)
        doc = db.query(db_module.Document).filter(db_module.Document.id == interp_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Stats target not found")
        lexicon = doc.lexicon_json or {}
    else:
        lexicon = interp.lexicon_json or {}
        
    total_unique_tokens = len(lexicon)
    pos_distribution = {}
    morpheme_type_distribution = {}
    
    for word, data in lexicon.items():
        if isinstance(data, dict):
            pos = data.get("pos", "Unknown")
            pos_distribution[pos] = pos_distribution.get(pos, 0) + 1
            for m in data.get("morphemes", []):
                mtype = m.get("type", "Unknown")
                morpheme_type_distribution[mtype] = morpheme_type_distribution.get(mtype, 0) + 1
            
    return {
        "total_unique_tokens": total_unique_tokens,
        "pos_distribution": pos_distribution,
        "morpheme_type_distribution": morpheme_type_distribution
    }

@app.post("/detect_language")
async def detect_language(request: Dict[str, str]):
    text = request.get("text", "")
    try:
        result = await translator.detect(text)
        return {"language": result.lang}
    except:
        return {"language": "sanskrit"}

@app.post("/transliterate")
async def transliterate_text(request: Dict[str, str]):
    text = request.get("text", "")
    # Placeholder: real transliteration would use a library like indic-transliteration
    return {"transliterated_text": text}

# --- Existing Analysis Logic ---

def get_filtered_models():
    try:
        models = []
        exclude = ['tts', 'robotics', 'computer-use', 'image', 'clip', 'deep-research', '2.5']
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                if not any(x in m.name.lower() for x in exclude):
                    models.append(m.name)
        models.sort(key=lambda x: ('2.0' in x or 'flash' in x), reverse=True)
        return models if models else ['models/gemini-1.5-flash', 'models/gemini-pro-latest']
    except:
        return ['models/gemini-1.5-flash']

async def process_chunk(words_subset: List[str], language: str, full_context: str):
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
    
    processing_progress = {"current": 0, "total": 0}
    
    try:
        doc_trans = await translator.translate(request.text, dest='en')
        document_translation = doc_trans.text
    except:
        document_translation = "Translation pending..."

    all_tokens = list(set(re.findall(r'[\u0900-\u0DFF\w]+', request.text)))
    all_tokens = [t for t in all_tokens if len(t) > 0]
    
    chunk_size = 10
    chunks = [all_tokens[i:i + chunk_size] for i in range(0, len(all_tokens), chunk_size)]
    
    processing_progress["total"] = len(chunks)
    final_lexicon = {}
    for i, chunk in enumerate(chunks):
        processing_progress["current"] = i + 1
        result = await process_chunk(chunk, request.language, request.text)
        if "words" in result:
            final_lexicon.update(result["words"])
        await asyncio.sleep(0.5)
            
    processing_progress = {"current": 0, "total": 0}
    return { "document_translation": document_translation, "words": final_lexicon }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_text(request: AnalysisRequest):
    if not GENI_API_KEY or GENI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(status_code=500, detail="API key missing.")
    
    prompt = f"""
    Act as a linguistic expert in {request.language}. 
    Provide a deep morphological breakdown for the following text: "{request.text}"
    Full Context (Sentence): "{request.context}"
    
    Return STRICT JSON following this structure:
    {{
      "translation": "English translation of the full selection",
      "breakdown": [
        {{
          "word": "original word",
          "transliteration": "ISO-15919 or similar scientific transliteration",
          "contextual_meaning": "meaning of this word in this specific context",
          "pos": "Part of speech (Noun, Verb, etc.)",
          "syntax_relation": "Grammatical role (Subject, Object, etc.)",
          "morphemes": [
            {{ "text": "morpheme", "type": "root/suffix/prefix", "meaning": "morpheme meaning", "pos": "morpheme-specific POS if applicable" }}
          ]
        }}
      ]
    }}
    """
    
    models = get_filtered_models()
    for model_name in models:
        try:
            model = genai.GenerativeModel(model_name, generation_config={"response_mime_type": "application/json"})
            response = await asyncio.to_thread(model.generate_content, prompt)
            data = json.loads(response.text)
            return AnalysisResponse(**data)
        except Exception as e:
            print(f"INFO: Analysis failed with {model_name}: {e}")
            continue
            
    raise HTTPException(status_code=500, detail="Linguistic analysis failed across all models.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
