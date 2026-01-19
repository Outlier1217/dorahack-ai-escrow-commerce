from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import pickle
import numpy as np
import traceback

app = FastAPI()

# Load model safely
try:
    with open("ai_risk_agent.pkl", "rb") as f:
        model = pickle.load(f)
    print("✅ AI model loaded successfully")
except Exception as e:
    print("❌ Model load failed:", e)
    model = None


@app.post("/predict")
async def predict(request: Request):
    try:
        # Read JSON safely
        data = await request.json()

        # Prepare features in EXACT training order
        features = [
            data.get("user_is_new", 0),
            data.get("order_amount", 0),
            data.get("total_past_orders", 0),
            data.get("refunds_last_30_days", 0),
            data.get("account_age_days", 0),
            data.get("days_since_delivery", 0),
            data.get("dispute_opened", 0)
        ]

        X = np.array(features, dtype=float).reshape(1, -1)

        if model is None:
            raise Exception("Model not loaded")

        decision = int(model.predict(X)[0])

        # ✅ ALWAYS return proper JSON
        return JSONResponse(
            status_code=200,
            content={
                "decision": decision
            }
        )

    except Exception as e:
        print("❌ AI CRASH")
        traceback.print_exc()

        # 🔒 Fallback JSON (never empty)
        return JSONResponse(
            status_code=200,
            content={
                "decision": 2,   # REJECT fallback
                "error": str(e)
            }
        )
