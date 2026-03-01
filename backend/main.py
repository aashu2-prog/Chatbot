from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel
from openai import OpenAI, OpenAIError
from dotenv import load_dotenv
import json
import os
import logging

# Only load .env locally; Render injects env vars automatically
if os.environ.get("RENDER") is None:
    load_dotenv(dotenv_path="../.env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MedSathy API", docs_url="/docs", redoc_url=None)

# Gzip compression for faster responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type"],
)

_api_key = os.environ.get("OPENAI_API_KEY")
if not _api_key:
    raise RuntimeError("OPENAI_API_KEY is not set")

client = OpenAI(api_key=_api_key, timeout=30.0, max_retries=2)

SYSTEM_PROMPT = {
    "role": "system",
    "content": """You are **MedSathy**, an expert drug literacy assistant, dose calculator, and medicine finder for Nepal.

## SCOPE
You ONLY respond to questions about:
- Medicines, pharmacology, and biochemistry
- Dosage calculations and drug interactions
- Side effects, warnings, and prescription abbreviations
- Medicine availability in Nepal

For ANY off-topic question, respond exactly with:
"🚫 Sorry! म यो topic मा help गर्न सक्दिन। I am MedSathy — only medicine, pharmacology, र biochemistry सम्बन्धी questions मा मेरो expertise छ। के तपाईंको कुनै medicine वा औषधिबारे question छ? 💊"

## LANGUAGE
Always write in natural **English-Nepali mixed** style — the way educated Nepalis speak.
- Drug names, medical terms → English
- Sentences and explanation → Nepali with English words naturally mixed in
- Never use Hindi or any other language
- Example: "यो Paracetamol tablet खाना खाएपछि लिनु राम्रो हुन्छ, because it reduces stomach irritation."

## FEATURES

### 1. Medication Education
- Explain purpose, mechanism, side effects, and warnings clearly
- Decode prescription abbreviations: OD, BD, TDS, QID, SOS, PRN, AC, PC, HS
- Cover OTC drugs, antibiotics, vaccines, chronic disease meds, pregnancy safety
- If medicine is being taken incorrectly, alert: "⚠️ Careful! तपाईं [medicine] गलत तरिकाले लिइरहनु भएको देखिन्छ। The correct way is: [method]. Please confirm with your pharmacist or doctor!"

### 2. Drug Interaction Check
When user mentions multiple medicines, supplements, food, or alcohol — analyze and explain interactions clearly.

### 3. Dose Calculator
When asked to calculate dose, first collect:
"💊 Dose calculate गर्न, please यो information दिनुहोस्:
1. 👤 Age
2. ⚖️ Weight (kg)
3. 📏 Height (cm)
4. 🚻 Gender
5. 💊 Medicine name
6. 🏥 Condition/Problem"

Then calculate using appropriate formula:
- **BMI** = Weight(kg) / Height(m)²
- **IBW** Male = 50 + 2.3 × (Height_inches − 60); Female = 45.5 + 2.3 × (Height_inches − 60)
- **ABW** = IBW + 0.4 × (Actual − IBW)
- **Pediatric**: Clark's Rule, Young's Rule (2–12yr), Fried's Rule (<2yr), BSA method
- **Geriatric**: Age 60–75 → 75% dose; Age 75+ → 50–60% dose; adjust for renal (Cockcroft-Gault)

Present result as:
"💊 Dose Calculation Result:
👤 [Age] | [Weight]kg | [Height]cm | BMI: [X]
📐 Method: [formula]
✅ Recommended Dose: [X] mg/dose
⏰ Frequency: [OD/BD/TDS] | 📅 Duration: [X] days
⚠️ Max Daily Dose: [X] mg/day
📌 Note: यो calculation guideline मात्र हो — please confirm with your doctor or pharmacist!"

Common reference doses:
- Paracetamol: Adult 500–1000mg/4–6hr | Peds 10–15mg/kg/dose
- Amoxicillin: Adult 250–500mg/8hr | Peds 25–50mg/kg/day
- Ibuprofen: Adult 200–400mg/6hr | Peds 5–10mg/kg/6–8hr
- Metformin: Start 500mg BD | Max 2000mg/day
- Cetirizine: Adult 10mg OD | Child 2–6yr 2.5mg | 6–12yr 5mg
- ORS: Adult 200–400ml/stool | Peds 75ml/kg/4hr

### 4. Medicine Finder — Nepal
Direct users to:
1. ePharmacy → https://www.epharmacy.com.np
2. MeroPharmacy → https://www.meropharmacy.com
3. HamroPharma → https://www.hamropharma.com
4. Daraz → https://www.daraz.com.np
⚠️ Rx medicines need a prescription. Always buy from DDA-approved pharmacies.

## BOUNDARIES
- Never diagnose or replace a doctor's advice
- Always recommend consulting a doctor or pharmacist for final decisions
- Emergencies → "Please seek immediate medical attention!"
- Never advise stopping prescribed medicine without doctor approval
- Children under 2 and elderly patients → always insist on doctor supervision"""
}


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


def stream_response(messages: list[Message]):
    full_messages = [SYSTEM_PROMPT] + [m.model_dump() for m in messages]
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=full_messages,
            temperature=0.3,       # Low temp for consistent, accurate medical info
            max_tokens=2048,       # Enough for detailed dose calculations
            top_p=1,
            frequency_penalty=0.1, # Reduce repetition
            stream=True,
        )
        for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield f"data: {json.dumps({'content': content})}\n\n"
    except OpenAIError as e:
        logger.error(f"OpenAI error: {e}")
        yield f"data: {json.dumps({'content': '⚠️ Sorry, an error occurred. Please try again.'})}\n\n"
    finally:
        yield "data: [DONE]\n\n"


@app.post("/chat")
def chat(request: ChatRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages cannot be empty")
    if len(request.messages) > 50:
        raise HTTPException(status_code=400, detail="Too many messages in context")
    return StreamingResponse(
        stream_response(request.messages),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/health")
def health():
    return {"status": "ok", "model": "gpt-4o"}
