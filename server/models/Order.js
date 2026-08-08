const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    item: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      default: 1,
    },
    total: {
      type: Number,
      required: true,
    },
    img: {
      type: String,
    },
    // Multi-item orders: array of individual items in this order
    items: [
      {
        name: { type: String },
        price: { type: Number },
        qty: { type: Number },
        total: { type: Number },
        img: { type: String },
      },
    ],
    customer: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    location: {
      type: String,
    },
    coords: {
      lat: Number,
      lng: Number,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "upi", "qr", "razorpay"],
      default: "cod",
    },
    status: {
      type: String,
      enum: ["pending", "preparing", "out-for-delivery", "delivered", "cancelled"],
      default: "pending",
    },
    deliveryPartner: {
      type: String,
      default: null,
    },
    rejectedBy: {
      type: [String],
      default: [],
    },
    assignedTo: {
      type: String,
      default: null,
    },
    date: {
      type: String,
    },
    // Payment-specific fields
    paymentReceived: {
      type: Boolean,
      default: false,
    },
    transactionId: {
      type: String,
    },
    codPaymentReceived: {
      type: Boolean,
    },
    codCollectionMethod: {
      type: String,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("Order", orderSchema);
