const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    password: {
      type: String,
      // Required only for local (email/password) signups — Google users won't have one
      required: function () {
        return this.provider === "local";
      },
      minlength: [6, "Password must be at least 6 characters"],
    },
    googleId: {
      type: String,
      default: null,
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    role: {
      type: String,
      enum: ["customer", "admin", "delivery"],
      default: "customer",
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups
userSchema.index({ googleId: 1 }, { sparse: true });

module.exports = mongoose.model("User", userSchema);
