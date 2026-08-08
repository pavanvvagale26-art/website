const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

// Google OAuth client — initialized lazily so server starts even without GOOGLE_CLIENT_ID
let googleClient = null;
function getGoogleClient() {
  if (!googleClient && process.env.GOOGLE_CLIENT_ID) {
    googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

// ── Helper: generate JWT ─────────────────────────────────────────────────────
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "365d" }
  );
}

// ── Helper: sanitize user for response (no password) ─────────────────────────
function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.__v;
  return {
    id: obj._id,
    name: obj.name,
    email: obj.email,
    phone: obj.phone || "",
    provider: obj.provider,
    role: obj.role,
    googleId: obj.googleId || null,
    createdAt: obj.createdAt,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/signup
// ══════════════════════════════════════════════════════════════════════════════
exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password, confirmPassword } = req.body;

    // ── Validate required fields ──
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required (name, email, password, confirmPassword).",
      });
    }

    // ── Validate email format ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // ── Validate password length ──
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // ── Validate password match ──
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    // ── Check duplicate email ──
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // ── Hash password ──
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ── Create user ──
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : "",
      password: hashedPassword,
      provider: "local",
      role: "customer",
    });

    console.log(`✅  New user registered: ${user.email}`);

    // Don't auto-login — customer must sign in separately
    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
    });
  } catch (err) {
    console.error("Signup error:", err);

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// ══════════════════════════════════════════════════════════════════════════════
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Validate fields ──
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // ── Find user ──
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ── Check if user signed up with Google ──
    if (user.provider === "google" && !user.password) {
      return res.status(401).json({
        success: false,
        message: "This account uses Google Sign-In. Please log in with Google.",
      });
    }

    // ── Compare passwords ──
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ── Generate token ──
    const token = generateToken(user);

    console.log(`🔑  User logged in: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/google
// ══════════════════════════════════════════════════════════════════════════════
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required.",
      });
    }

    const client = getGoogleClient();
    if (!client) {
      return res.status(500).json({
        success: false,
        message: "Google Sign-In is not configured on the server.",
      });
    }

    // ── Verify Google ID token ──
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyErr) {
      console.error("Google token verification failed:", verifyErr.message);
      return res.status(401).json({
        success: false,
        message: "Invalid Google token.",
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // ── Check if user exists (by googleId or email) ──
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      // Update googleId if user signed up with email first
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = "google";
        await user.save();
      }
    } else {
      // ── Create new user ──
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        provider: "google",
        role: "customer",
      });
      console.log(`✅  New Google user created: ${email}`);
    }

    // ── Generate token ──
    const token = generateToken(user);

    console.log(`🔑  Google login: ${user.email}`);

    return res.status(200).json({
      success: true,
      message: "Google login successful!",
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("Google login error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/auth/me
// ══════════════════════════════════════════════════════════════════════════════
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("GetMe error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// ══════════════════════════════════════════════════════════════════════════════
exports.logout = async (req, res) => {
  // Since we use localStorage-based tokens (not HttpOnly cookies),
  // logout is primarily handled on the client side.
  // This endpoint exists for API completeness and future cookie support.
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};
