const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/google", authController.googleLogin);
router.post("/logout", authController.logout);

// Protected routes
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
