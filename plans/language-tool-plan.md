# Implementation Plan: Indian Language Morphological Analyzer

## Background & Motivation
The user wants to build a language learning tool specifically designed for highly agglutinative Indian languages like Tamil, Malayalam, Kannada, Sanskrit, etc. The tool will allow a user to input text and highlight (click and drag) parts of the text (from a single word to entire phrases). A floating hover bubble will appear, providing a direct translation and a detailed morphological/grammatical breakdown of the selected text, separating roots from suffixes.

## Scope & Impact
The project consists of three main components:
1. **Frontend:** A beautiful, responsive UI built with React (Next.js) and Tailwind CSS. It will handle user text input, text selection events, and render the interactive floating hover bubble.
2. **Backend:** A fast, lightweight Python backend using FastAPI to act as the bridge between the frontend and the LLM.
3. **AI Engine:** Google's Gemini API, which will act as the linguistic morphological analyzer, parsing the text and returning a structured JSON response containing the root words, suffix breakdowns, and English translation.

## Proposed Solution
### Architecture Breakdown

#### 1. Frontend (Next.js + Tailwind CSS)
*   **Main Workspace:** A clean page with a large text area where users can type or paste text in any supported Indian language.
*   **Selection Logic:** A custom React Hook (`useTextSelection`) that listens for `mouseup` and `touchend` events. It will use `window.getSelection()` to capture the highlighted text and its surrounding context (full sentence) for better LLM accuracy.
*   **Hover Bubble (Popover):** A floating UI component. When text is selected, the frontend calculates its position using `Range.getBoundingClientRect()` and dynamically positions the popover above the highlighted text. It will display loading states, and then the returned translation/breakdown.

#### 2. Backend (FastAPI)
*   An API endpoint (e.g., `POST /api/analyze`) that accepts the highlighted string, the surrounding sentence context, and optionally the language (if auto-detect is not used).
*   Handles rate-limiting and acts as a secure proxy to the Gemini API, ensuring the API keys are not exposed to the client.

#### 3. LLM Integration (Gemini API)
*   A robustly crafted prompt designed to force the LLM to act as a linguistic morphological analyzer.
*   **Prompt Engineering:** The prompt will request a direct translation and a word-by-word grammatical breakdown, returning the data in a strict JSON schema (using `response_schema` feature of Gemini API or system instructions) to ensure the Next.js frontend can parse it predictably without regex hacking.
*   *Expected JSON format:*
    ```json
    {
      "translation": "Come to my house (polite)",
      "breakdown": [
        {
          "word": "வீட்டில்",
          "root": "வீடு",
          "root_meaning": "house",
          "suffixes": [{"suffix": "இல்", "function": "locative case / in"}]
        },
        ...
      ]
    }
    ```

## Alternatives Considered
*   **Standard Translation APIs (e.g., Google Cloud Translate):** These only provide semantic translation (meaning) and cannot break down words morphologically. Rejected in favor of an LLM.
*   **Traditional NLP Parsers:** Writing custom suffix-stripping algorithms for multiple agglutinative languages is highly complex and error-prone. LLMs offer a much more flexible and scalable solution for this phase.
*   **Vanilla JS:** While lightweight, React (Next.js) provides superior state management for the complex floating UI popovers, loading states, and API error handling required for a polished product.

## Implementation Steps

### Phase 1: Foundation (Frontend Setup)
1. Initialize a Next.js project with Tailwind CSS (`npx create-next-app@latest`).
2. Design and implement the main UI layout, including a beautiful text input area and language selection dropdown.

### Phase 2: The Interactive UI (Selection & Popover)
1. Implement the text selection detection logic to grab `window.getSelection()`.
2. Build the floating Hover Bubble component.
3. Use DOM metrics (`getBoundingClientRect`) to accurately position the bubble above the selected text. Add smooth transitions/animations.

### Phase 3: Backend Bridge (FastAPI Setup)
1. Set up a Python virtual environment and install FastAPI, Uvicorn, and `google-generativeai`.
2. Create the `POST /analyze` endpoint that accepts the JSON payload from the Next.js frontend.
3. Setup CORS middleware to allow the Next.js frontend (usually `localhost:3000`) to communicate with FastAPI (usually `localhost:8000`).

### Phase 4: Gemini API Integration (The "Brains")
1. Integrate the Gemini SDK into the FastAPI backend.
2. Craft the core prompt instructing Gemini to perform morphological analysis on Indian languages.
3. Configure the API call to strictly output the structured JSON required by the frontend.
4. Implement error handling (e.g., if the user highlights nonsense or whitespace).

### Phase 5: Connection and Rendering (Full Stack)
1. Connect the Next.js frontend to the FastAPI backend.
2. When text is highlighted, show a loading spinner in the bubble, fire the API request, and then beautifully render the returned JSON breakdown (root word, suffixes, grammatical function) inside the bubble.

## Verification & Testing
*   **Unit Tests:** Verify the React text selection logic correctly extracts strings and bounding boxes.
*   **Integration Tests:** Verify the FastAPI endpoint correctly parses requests and communicates with the Gemini API.
*   **Manual UI Testing:** Ensure the hover bubble accurately tracks highlighting, doesn't overflow off-screen, and looks beautiful on both desktop and mobile views. Test with various languages (Tamil, Malayalam, Sanskrit).