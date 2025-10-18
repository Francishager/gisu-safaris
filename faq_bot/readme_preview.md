# Gisu Safaris FAQ Bot

## Setup

1. Clone or copy the project folder
2. Create and activate a virtual environment:
   - Windows:
     python -m venv venv
     venv\Scripts\activate
   - Linux/macOS:
     python3 -m venv venv
     source venv/bin/activate
3. Install dependencies:
   pip install -r requirements.txt
4. Run the FastAPI server:
   uvicorn app:app --reload
5. Access Swagger UI:
   http://127.0.0.1:8000/docs
6. Use the `/ask` endpoint to test questions:
   - Example: {"question": "What safaris do you offer in Uganda?"}
   - Example: {"question": "Convert 500 USD to UGX"}

