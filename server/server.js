require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const Order = require("./models/Order");

const app = express();
const PORT = process.env.PORT || 5000;

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
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).lean();

    // Map orderId → id so the frontend doesn't need any changes
    const mapped = orders.map((o) => {
      const { _id, orderId, __v, ...rest } = o;
      return { id: orderId, ...rest };
    });

    res.json(mapped);
  } catch (err) {
    console.error("GET /api/orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ── POST /api/orders ──────────────────────────────────────────────────────────
// Body: order object from the customer (item, price, qty, total, customer info, etc.)
// Creates a new order with server-side timestamp and ID, status = "pending"
app.post("/api/orders", async (req, res) => {
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

    const newOrder = await Order.create({
      orderId: `ORD-${Date.now()}`,
      ...orderData,
      status: "pending",
      deliveryPartner: null,
      date: localDate,
    });

    // Return the same shape the frontend expects
    const response = {
      id: newOrder.orderId,
      item: newOrder.item,
      price: newOrder.price,
      qty: newOrder.qty,
      total: newOrder.total,
      img: newOrder.img,
      items: newOrder.items || [],
      customer: newOrder.customer,
      phone: newOrder.phone,
      email: newOrder.email,
      location: newOrder.location,
      coords: newOrder.coords,
      paymentMethod: newOrder.paymentMethod,
      status: newOrder.status,
      deliveryPartner: newOrder.deliveryPartner,
      createdAt: newOrder.createdAt.toISOString(),
      date: newOrder.date,
    };

    console.log(`📦  New order: ${response.id} — ${response.item} (${(response.items || []).length} items) by ${response.customer}`);
    return res.status(201).json(response);
  } catch (err) {
    console.error("POST /api/orders error:", err);
    return res.status(500).json({ error: "Failed to save order" });
  }
});

// ── PATCH /api/orders/:id ─────────────────────────────────────────────────────
// Body: { status?, deliveryPartner?, codPaymentReceived?, codCollectionMethod? }
// Updates a specific order's fields (admin / delivery actions)
app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await Order.findOneAndUpdate(
      { orderId: id },
      { $set: updates },
      { new: true, lean: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Return same shape
    const { _id, orderId, __v, ...rest } = updated;
    const response = { id: orderId, ...rest };

    console.log(`✏️  Order ${id} updated:`, updates);
    return res.status(200).json(response);
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

// ── Connect to MongoDB and start server ──────────────────────────────────────
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("❌  Missing MONGODB_URI in server/.env");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅  Connected to MongoDB Atlas");

    app.listen(PORT, () => {
      console.log(`\n🚀  SGS Restaurant API running on http://localhost:${PORT}`);
      console.log(`   GET  /api/orders`);
      console.log(`   POST /api/orders`);
      console.log(`   PATCH /api/orders/:id`);
      console.log(`   POST /api/create-order`);
      console.log(`   POST /api/verify-payment`);
      console.log(`   GET  /api/health\n`);
    });
  } catch (err) {
    console.error("❌  Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }
}

startServer();
