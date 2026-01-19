const express = require("express");
const axios = require("axios");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const ORDERS_FILE = "./orders.json";
const THRESHOLD = 200;

function loadOrders() {
  if (!fs.existsSync(ORDERS_FILE)) return [];
  const data = fs.readFileSync(ORDERS_FILE, "utf-8").trim();
  return data ? JSON.parse(data) : [];
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

app.post("/place-order", async (req, res) => {
  try {
    const orders = loadOrders();
    const orderId = orders.length + 1;

    const ai = await axios.post("http://127.0.0.1:8000/predict", {
      ...req.body,
      days_since_delivery: 0,
      dispute_opened: 0
    });

    const decision = Number(ai.data.decision ?? 2);
    const amount = Number(req.body.order_amount);

    // 🔥 FINAL FLOW DECISION
    let payment_flow = "AUTO_APPROVE";

    if (amount > THRESHOLD || decision === 1) {
      payment_flow = "HOLD_VERIFICATION";
    }

    const order = {
      orderId,
      amount,
      ai_decision: decision,
      payment_flow,
      status: payment_flow === "AUTO_APPROVE" ? "ALLOW_PAYMENT" : "UNDER_VERIFICATION",
      timestamp: new Date().toISOString()
    };

    orders.push(order);
    saveOrders(orders);

    return res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order failed" });
  }
});

app.listen(3001, () =>
  console.log("Backend running on http://localhost:3001")
);
