from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import requests
import re

app = FastAPI(title="Gisu Safaris FAQ Bot")

# Load the QA model once
qa_pipeline = pipeline("question-answering", model="distilbert-base-uncased-distilled-squad")

# FAQ context
FAQ_CONTEXT = """
Gisu Safaris is East Africa's premier safari company, based in Kampala, Uganda. 
We offer exceptional wildlife, adventure, and cultural experiences across Uganda, Kenya, Tanzania, Rwanda, and other East African destinations.

Company Overview:
- Specializes in mountain gorilla trekking, Big Five safaris, cultural tours, Mount Kilimanjaro trekking, and multi-country adventures.
- Focused on personalized service, eco-friendly tourism, and small group travel.

Safari Packages:

Uganda:
- Gorilla Trekking in Bwindi Impenetrable Forest (5 days, luxury lodges, from $1,200)
- Wildlife Safari in Queen Elizabeth National Park (5 days, from $1,150)
- Murchison Falls Safari (4 days, from $1,100)

Kenya:
- Masai Mara Big Five Safari (5 days, from $1,150)
- Amboseli Safari (3 days, from $950)
- Kenya Classic Safari (7 days, from $1,400)

Tanzania:
- Serengeti Great Migration Safari (6 days, from $2,000)
- Ngorongoro Crater Safari (4 days, from $1,800)
- Mount Kilimanjaro Trekking (7 days, from $2,350)

Rwanda:
- Volcanoes National Park Gorilla & Golden Monkey Trekking (4 days, from $1,100)

Multi-Country Safaris:
- Uganda-Rwanda Gorilla Trekking (6 days, from $1,500)
- Kenya-Tanzania Great Migration Safari (8 days, from $2,000)

Services:
- Hotel booking and luxury lodge reservations
- Travel insurance arrangements
- Air ticketing for local and international flights
- Car hire for safaris and tours
- Visa assistance for Uganda, Kenya, Tanzania, and Rwanda
- Customized itinerary planning for groups and individuals

Pricing:
- Safari packages generally range from $950 to $2,000 depending on duration and destination
- Payment accepted in USD, UGX, EUR, GBP, or other major currencies
- Real-time exchange rates can be provided by the FAQ bot

General Safari Tips:
- Best time for gorilla trekking: Juneâ€“September and Decemberâ€“February
- Best time for wildlife safaris: Juneâ€“October and Decemberâ€“February
- Wear comfortable walking shoes and layered clothing
- Bring a camera, binoculars, and insect repellent

Specific Safari Highlights:
- Gorilla trekking in Bwindi Impenetrable Forest and Volcanoes National Park
- Big Five sightings in Masai Mara, Serengeti, and Amboseli
- Birdwatching and photography opportunities
- Cultural interactions with local communities
- Adventure activities: hiking, white-water rafting, and nature walks

Contact Information:
- Email: info@gisusafaris.com
- Phone: +256 780 950 555 / +614 7891 4106
- Address: Kampala, Uganda

Visitors can ask questions about:
- Safari packages (Uganda, Kenya, Tanzania, Rwanda, multi-country)
- Specific safari details and durations
- Pricing and exchange rates
- Services provided (hotel booking, travel insurance, air tickets, car hire, visa)
- Travel tips, best times to visit, and safari preparations
"""

# African currency codes
AFRICAN_CURRENCIES = {
    "UGX", "KES", "TZS", "ZAR", "NGN", "GHS", "RWF", "BIF", "ETB", "SSP", "MWK", "ZMW", "MUR", "SCR"
}

class QARequest(BaseModel):
    question: str

def get_exchange_rate(amount: float = 1, base_currency: str = "USD", target_currency: str = "UGX"):
    """Fetch real-time exchange rate and calculate conversion if amount > 1"""
    try:
        url = f"https://api.exchangerate.host/convert?from={base_currency}&to={target_currency}&amount={amount}"
        response = requests.get(url).json()
        result = response.get("result")
        if result is not None:
            return f"{amount} {base_currency} = {result:.2f} {target_currency}"
        else:
            return "Sorry, could not fetch the exchange rate."
    except Exception:
        return "Error fetching exchange rate."

@app.post("/ask")
def ask_question(req: QARequest):
    question = req.question.lower()

    # Detect exchange rate queries
    if "exchange rate" in question or "rate" in question or "convert" in question:
        # Extract amount
        amount_match = re.search(r"\b\d+(\.\d+)?\b", question)
        amount = float(amount_match.group()) if amount_match else 1.0

        # Find currencies
        codes = [word.upper() for word in question.split() if word.upper() in AFRICAN_CURRENCIES or len(word) == 3]

        if len(codes) == 1:
            return {"answer": get_exchange_rate(amount, codes[0])}
        elif len(codes) >= 2:
            return {"answer": get_exchange_rate(amount, codes[0], codes[1])}
        else:
            return {"answer": get_exchange_rate(amount, "USD", "UGX")}

    # Otherwise, use FAQ
    result = qa_pipeline(question=req.question, context=FAQ_CONTEXT)
    return {"answer": result["answer"], "score": result["score"]}

