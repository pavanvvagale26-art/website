/**
 * One-time migration script: reads orders.json and inserts them into MongoDB.
 *
 * Usage:
 *   node scripts/migrate-to-mongo.js
 *
 * Make sure MONGODB_URI is set in server/.env before running.
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Order = require("../models/Order");

const ORDERS_FILE = path.join(__dirname, "..", "data", "orders.json");

async function migrate() {
  if (!process.env.MONGODB_URI) {
    console.error("❌  MONGODB_URI not set in .env");
    process.exit(1);
  }

  if (!fs.existsSync(ORDERS_FILE)) {
    console.log("⚠️  No orders.json found — nothing to migrate.");
    process.exit(0);
  }

  const raw = fs.readFileSync(ORDERS_FILE, "utf8");
  const orders = JSON.parse(raw);

  if (orders.length === 0) {
    console.log("⚠️  orders.json is empty — nothing to migrate.");
    process.exit(0);
  }

  console.log(`📦  Found ${orders.length} orders to migrate...`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅  Connected to MongoDB Atlas");

  let inserted = 0;
  let skipped = 0;

  for (const order of orders) {
    // Map the "id" field from JSON to "orderId" in Mongo
    const doc = {
      orderId: order.id,
      item: order.item,
      price: order.price,
      qty: order.qty,
      total: order.total,
      img: order.img,
      customer: order.customer,
      phone: order.phone,
      email: order.email,
      location: order.location,
      coords: order.coords,
      paymentMethod: order.paymentMethod,
      status: order.status,
      deliveryPartner: order.deliveryPartner,
      date: order.date,
      paymentReceived: order.paymentReceived,
      transactionId: order.transactionId,
      codPaymentReceived: order.codPaymentReceived,
      codCollectionMethod: order.codCollectionMethod,
      createdAt: order.createdAt ? new Date(order.createdAt) : new Date(),
    };

    try {
      await Order.create(doc);
      inserted++;
      console.log(`  ✅  ${doc.orderId} — ${doc.item}`);
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key — already migrated
        skipped++;
        console.log(`  ⏭️  ${doc.orderId} already exists — skipped`);
      } else {
        console.error(`  ❌  ${doc.orderId} failed:`, err.message);
      }
    }
  }

  console.log(`\n🎉  Migration complete: ${inserted} inserted, ${skipped} skipped`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
