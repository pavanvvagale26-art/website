require("dotenv").config();
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Data store path ───────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

// Ensure data directory and orders file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([]), "utf8");
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type"],
  })
);

// ── Razorpay instance ───────────────────────────────────────────────────────
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error(
    "❌  Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in server/.env"
  );
  process.exit(1);
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "SGS Restaurant API is running" });
});

// ── GET /api/orders ───────────────────────────────────────────────────────────
// Returns all orders sorted newest first
app.get("/api/orders", (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

// ── POST /api/orders ──────────────────────────────────────────────────────────
// Body: order object from the customer (item, price, qty, total, customer info, etc.)
// Creates a new order with server-side timestamp and ID, status = "pending"
app.post("/api/orders", (req, res) => {
  try {
    const orderData = req.body;
    if (!orderData || !orderData.item) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const localDate = `${year}-${month}-${day}`;

    const newOrder = {
      id: `ORD-${Date.now()}`,
      ...orderData,
      status: "pending",
      deliveryPartner: null,
      createdAt: now.toISOString(),
      date: localDate,
    };

    const orders = readOrders();
    orders.unshift(newOrder); // newest first
    writeOrders(orders);

    console.log(`📦  New order: ${newOrder.id} — ${newOrder.item} by ${newOrder.customer}`);
    return res.status(201).json(newOrder);
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return res.status(500).json({ error: "Failed to save order" });
  }
});

// ── PATCH /api/orders/:id ─────────────────────────────────────────────────────
// Body: { status?, deliveryPartner?, codPaymentReceived?, codCollectionMethod? }
// Updates a specific order's fields (admin / delivery actions)
app.patch("/api/orders/:id", (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const orders = readOrders();
    const idx = orders.findIndex((o) => o.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    orders[idx] = { ...orders[idx], ...updates };
    writeOrders(orders);

    console.log(`✏️  Order ${id} updated:`, updates);
    return res.status(200).json(orders[idx]);
  } catch (err) {
    console.error("PATCH /api/orders/:id error:", err);
    return res.status(500).json({ error: "Failed to update order" });
  }
});

// ── POST /api/create-order ───────────────────────────────────────────────────
// Body: { amount: <number in paise>, currency: "INR", receipt: "receipt_xxx" }
// Response: { order_id, amount, currency }
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    // Validate amount
    const amountInt = parseInt(amount, 10);
    if (!amountInt || isNaN(amountInt)) {
      return res.status(400).json({ error: "amount is required and must be a number" });
    }
    if (amountInt < 100) {
      return res
        .status(400)
        .json({ error: "amount must be at least 100 paise (₹1)" });
    }

    const options = {
      amount: amountInt,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error("Razorpay create-order error:", err);

    if (err.statusCode === 401) {
      return res.status(401).json({ error: "Razorpay authentication failed" });
    }
    return res
      .status(500)
      .json({ error: "Failed to create Razorpay order", details: err.error || err.message });
  }
});

// ── POST /api/verify-payment ─────────────────────────────────────────────────
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Response: { success: true } | 400 on mismatch
app.post("/api/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  // Validate required fields
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: razorpay_order_id, razorpay_payment_id, razorpay_signature",
    });
  }

  // Generate expected signature: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  const isValid = expectedSignature === razorpay_signature;

  if (!isValid) {
    console.warn(
      `⚠️  Signature mismatch for order ${razorpay_order_id} — possible tampered request`
    );
    return res.status(400).json({
      success: false,
      error: "Payment signature verification failed",
    });
  }

  console.log(`✅  Payment verified — order: ${razorpay_order_id}, payment: ${razorpay_payment_id}`);
  return res.status(200).json({
    success: true,
    payment_id: razorpay_payment_id,
    order_id: razorpay_order_id,
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  SGS Restaurant API running on http://localhost:${PORT}`);
  console.log(`   GET  /api/orders`);
  console.log(`   POST /api/orders`);
  console.log(`   PATCH /api/orders/:id`);
  console.log(`   POST /api/create-order`);
  console.log(`   POST /api/verify-payment`);
  console.log(`   GET  /api/health\n`);
});
