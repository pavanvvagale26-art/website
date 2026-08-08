require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");

const Order = require("./models/Order");
const authRoutes = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://website-vlor.vercel.app",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

// ── Auth routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// ══════════════════════════════════════════════════════════════════════════════
// ── DELIVERY PARTNER REGISTRY (in-memory) ────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// Each entry: { name: "...", phone: "...", registeredAt: <timestamp> }
let activeDeliveryPartners = [];

// Round-robin index: tracks which partner got the last assignment so we cycle
let lastAssignedIndex = -1;

// Helper: find the next available (registered + not busy) partner
// "busy" = currently delivering an order (deliveryPartner === name & status === out_for_delivery)
async function getNextAvailablePartner(excludeNames = []) {
  if (activeDeliveryPartners.length === 0) return null;

  // Find partners currently busy delivering
  const busyPartners = await Order.find({
    status: "out_for_delivery",
    deliveryPartner: { $ne: null },
  }).distinct("deliveryPartner");

  const total = activeDeliveryPartners.length;

  // Cycle through all partners starting from the one after lastAssignedIndex
  for (let i = 0; i < total; i++) {
    const idx = (lastAssignedIndex + 1 + i) % total;
    const partner = activeDeliveryPartners[idx];

    // Skip if they rejected this order, or they're currently delivering
    if (excludeNames.includes(partner.name)) continue;
    if (busyPartners.includes(partner.name)) continue;

    lastAssignedIndex = idx;
    return partner.name;
  }

  return null; // Everyone is busy or has rejected
}

// ── POST /api/delivery-partners/register ─────────────────────────────────────
app.post("/api/delivery-partners/register", async (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  // Remove duplicate (re-registration)
  activeDeliveryPartners = activeDeliveryPartners.filter((p) => p.name !== name);
  activeDeliveryPartners.push({ name, phone: phone || "", registeredAt: Date.now() });

  console.log(`🟢  Delivery partner registered: ${name} (${activeDeliveryPartners.length} active)`);

  // ── Auto-assign any unassigned "out_for_delivery" orders to available partners ──
  try {
    const unassignedOrders = await Order.find({
      status: "out_for_delivery",
      deliveryPartner: null,
      assignedTo: null,
    });

    for (const order of unassignedOrders) {
      const rejectedList = order.rejectedBy || [];
      const nextPartner = await getNextAvailablePartner(rejectedList);
      if (nextPartner) {
        await Order.findOneAndUpdate(
          { orderId: order.orderId },
          { $set: { assignedTo: nextPartner } }
        );
        console.log(`📋  Auto-assigned unassigned order ${order.orderId} → ${nextPartner}`);
      }
    }
  } catch (err) {
    console.error("Auto-assign on register error:", err);
  }

  return res.json({ success: true, partners: activeDeliveryPartners.map((p) => p.name) });
});

// ── POST /api/delivery-partners/unregister ───────────────────────────────────
app.post("/api/delivery-partners/unregister", (req, res) => {
  const { name } = req.body;
  activeDeliveryPartners = activeDeliveryPartners.filter((p) => p.name !== name);

  console.log(`🔴  Delivery partner unregistered: ${name} (${activeDeliveryPartners.length} active)`);
  return res.json({ success: true });
});

// ── GET /api/delivery-partners ───────────────────────────────────────────────
app.get("/api/delivery-partners", (req, res) => {
  res.json(activeDeliveryPartners.map((p) => ({ name: p.name, phone: p.phone })));
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
      assignedTo: null,
      rejectedBy: [],
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
      assignedTo: newOrder.assignedTo || null,
      rejectedBy: newOrder.rejectedBy || [],
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

// ── POST /api/orders/:id/reject ───────────────────────────────────────────────
// Body: { partnerName: "<name>" }
// Adds the partner to rejectedBy, auto-assigns to the NEXT available partner in cycle
app.post("/api/orders/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { partnerName } = req.body;

    if (!partnerName) {
      return res.status(400).json({ error: "partnerName is required" });
    }

    // Step 1: Add to rejectedBy, clear assignedTo and deliveryPartner
    let updated = await Order.findOneAndUpdate(
      { orderId: id },
      {
        $addToSet: { rejectedBy: partnerName },
        $set: { assignedTo: null, deliveryPartner: null },
      },
      { new: true, lean: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Step 2: Auto-assign to the next available partner in the cycle
    const nextPartner = await getNextAvailablePartner(updated.rejectedBy || []);

    if (nextPartner) {
      updated = await Order.findOneAndUpdate(
        { orderId: id },
        { $set: { assignedTo: nextPartner } },
        { new: true, lean: true }
      );
      console.log(`🔄  Order ${id} rejected by ${partnerName} → reassigned to ${nextPartner}`);
    } else {
      console.log(`⚠️  Order ${id} rejected by ${partnerName} — no available partners left`);
    }

    const { _id, orderId, __v, ...rest } = updated;
    const response = { id: orderId, ...rest };

    return res.status(200).json(response);
  } catch (err) {
    console.error("POST /api/orders/:id/reject error:", err);
    return res.status(500).json({ error: "Failed to reject order" });
  }
});

// ── PATCH /api/orders/:id ─────────────────────────────────────────────────────
// Body: { status?, deliveryPartner?, codPaymentReceived?, codCollectionMethod? }
// Updates a specific order's fields (admin / delivery actions)
// If status changes to "out_for_delivery", auto-assigns to the first available partner
app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    let updated = await Order.findOneAndUpdate(
      { orderId: id },
      { $set: updates },
      { new: true, lean: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Auto-assign when admin marks "out_for_delivery" without a specific partner
    if (
      updates.status === "out_for_delivery" &&
      !updates.deliveryPartner &&
      !updated.assignedTo
    ) {
      const nextPartner = await getNextAvailablePartner(updated.rejectedBy || []);
      if (nextPartner) {
        updated = await Order.findOneAndUpdate(
          { orderId: id },
          { $set: { assignedTo: nextPartner } },
          { new: true, lean: true }
        );
        console.log(`📋  Order ${id} auto-assigned to ${nextPartner}`);
      }
    }

    // When a partner accepts (deliveryPartner is set), clear assignedTo
    if (updates.deliveryPartner) {
      updated = await Order.findOneAndUpdate(
        { orderId: id },
        { $set: { assignedTo: null } },
        { new: true, lean: true }
      );
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
      console.log(`   POST /api/auth/signup`);
      console.log(`   POST /api/auth/login`);
      console.log(`   POST /api/auth/google`);
      console.log(`   GET  /api/auth/me`);
      console.log(`   POST /api/auth/logout`);
      console.log(`   GET  /api/orders`);
      console.log(`   POST /api/orders`);
      console.log(`   PATCH /api/orders/:id`);
      console.log(`   POST /api/orders/:id/reject`);
      console.log(`   POST /api/delivery-partners/register`);
      console.log(`   POST /api/delivery-partners/unregister`);
      console.log(`   GET  /api/delivery-partners`);
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
