# Gisu Safaris FAQ Bot (FastAPI)

FastAPI microservice that answers FAQs and simple currency conversions, used by the site’s AI Safari Bot via the PHP bridge `backend/api/ai_answer.php`.

## Endpoints
- `GET /health` → health check and model info
- `POST /ask` → body: `{ "question": "...", "history": [...], "preferences": {...} }`
  - Returns: `{ answer: string, score?: number, model: string }`

## Project Layout
```
faq_bot/
  app/
    __init__.py
    main.py            # FastAPI app
  data/
    faq_context.txt    # Editable FAQ context (UTF-8)
  requirements.txt
```

## Run Locally (Windows)
```powershell
# From repo root
python -m venv faq_bot\venv
faq_bot\venv\Scripts\activate
pip install -r faq_bot\requirements.txt
uvicorn faq_bot.app.main:app --host 127.0.0.1 --port 8001 --workers 1
```

## Configure PHP bridge
Set the URL in your environment (loaded by `backend/config/config.php`):
```
FAQ_BOT_URL=http://127.0.0.1:8001
```
The front-end calls `POST /backend/api/ai_answer.php` as before. PHP will forward to FastAPI `/ask` first, and fall back to OpenAI RAG if the service is down.

## Update context
Edit `faq_bot/data/faq_context.txt` for updated copy (phone numbers, tips, etc.). The service reads the file on startup.

## Test
```powershell
# Health
curl http://127.0.0.1:8001/health

# Ask
curl -X POST http://127.0.0.1:8001/ask -H "Content-Type: application/json" -d '{"question":"Best time for gorilla trekking?"}'
```

## Notes
- First run downloads the QA model; allow a minute.
- CORS is enabled for `https://gisusafaris.com` and localhost dev origins.
- No front-end changes required; integration is backend-only.
