from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from transformers import pipeline
import requests
import os
import re

app = FastAPI(title="Gisu Safaris FAQ Bot", version="1.0.0")

# CORS
_default_origins = [
    "https://gisusafaris.com",
    "http://localhost",
    "http://127.0.0.1",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
]
allow_origins = os.getenv("FAQ_BOT_ALLOW_ORIGINS")
if allow_origins:
    origins = [o.strip() for o in allow_origins.split(",") if o.strip()]
else:
    origins = _default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load context from file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # faq_bot/
CTX_PATH = os.path.join(BASE_DIR, "data", "faq_context.txt")

def load_context() -> str:
    try:
        with open(CTX_PATH, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return (
            "Gisu Safaris is East Africa's premier safari company based in Kampala, Uganda. "
            "We offer wildlife, adventure and cultural experiences across Uganda, Kenya, Tanzania and Rwanda."
        )

FAQ_CONTEXT = load_context()

# Initialize QA pipeline once
try:
    qa_pipeline = pipeline("question-answering", model="distilbert-base-uncased-distilled-squad")
    MODEL_NAME = "distilbert-base-uncased-distilled-squad"
except Exception as e:
    qa_pipeline = None
    MODEL_NAME = f"unavailable: {e}"

AFRICAN_CURRENCIES = {
    "UGX", "KES", "TZS", "ZAR", "NGN", "GHS", "RWF", "BIF", "ETB", "SSP", "MWK", "ZMW", "MUR", "SCR",
    "EUR", "USD", "GBP", "AUD", "CAD"
}

class QARequest(BaseModel):
    question: str
    history: Optional[List[Dict[str, Any]]] = None
    preferences: Optional[Dict[str, Any]] = None


def get_exchange_rate(amount: float = 1.0, base_currency: str = "USD", target_currency: str = "UGX") -> str:
    try:
        url = f"https://api.exchangerate.host/convert?from={base_currency}&to={target_currency}&amount={amount}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        result = data.get("result")
        if result is not None:
            return f"{amount} {base_currency} = {result:.2f} {target_currency}"
        return "Sorry, could not fetch the exchange rate."
    except Exception:
        return "Error fetching exchange rate."


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/ask")
def ask(req: QARequest):
    q = (req.question or "").strip()
    lower = q.lower()

    # Exchange rate detection
    if any(x in lower for x in ["exchange rate", "convert", "rate "]):
        amount_match = re.search(r"\b\d+(?:\.\d+)?\b", lower)
        amount = float(amount_match.group()) if amount_match else 1.0

        tokens = re.findall(r"[A-Za-z]{3}", lower)
        codes = [t.upper() for t in tokens if t.upper() in AFRICAN_CURRENCIES]

        if len(codes) == 1:
            return {"answer": get_exchange_rate(amount, codes[0]), "score": 1.0, "model": MODEL_NAME}
        elif len(codes) >= 2:
            return {"answer": get_exchange_rate(amount, codes[0], codes[1]), "score": 1.0, "model": MODEL_NAME}
        else:
            return {"answer": get_exchange_rate(amount, "USD", "UGX"), "score": 1.0, "model": MODEL_NAME}

    # Fallback to QA pipeline
    if qa_pipeline is None:
        return {"answer": "AI model temporarily unavailable.", "score": 0.0, "model": MODEL_NAME}

    try:
        res = qa_pipeline(question=q, context=FAQ_CONTEXT)
        answer = res.get("answer", "")
        score = float(res.get("score", 0.0))
        return {"answer": answer, "score": score, "model": MODEL_NAME}
    except Exception:
        return {"answer": "Sorry, I couldn't process that right now.", "score": 0.0, "model": MODEL_NAME}
