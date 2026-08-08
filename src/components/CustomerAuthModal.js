import React, { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  FaTimes,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSignInAlt,
  FaUserPlus,
  FaCheckCircle,
} from "react-icons/fa";
import "../App.css";

export default function CustomerAuthModal() {
  const navigate = useNavigate();
  const {
    showCustomerAuthModal,
    setShowCustomerAuthModal,
    login,
    signup,
    loading: authLoading,
  } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("signin"); // "signin" | "signup"

  // Sign In fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Sign Up fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Success state
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset all fields when modal opens/closes
  useEffect(() => {
    if (!showCustomerAuthModal) {
      resetAll();
    }
  }, [showCustomerAuthModal]);

  const resetAll = () => {
    setLoginEmail("");
    setLoginPassword("");
    setShowLoginPassword(false);
    setLoginError("");
    setLoginLoading(false);
    setSignupName("");
    setSignupEmail("");
    setSignupPhone("");
    setSignupPassword("");
    setSignupConfirm("");
    setShowSignupPassword(false);
    setShowSignupConfirm(false);
    setSignupError("");
    setSignupLoading(false);
    setShowSuccess(false);
    setActiveTab("signin");
  };

  const handleClose = () => {
    setShowCustomerAuthModal(false);
  };

  // ─── Sign In Submit ───
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail || !loginPassword) {
      setLoginError("Please fill in all fields.");
      return;
    }

    setLoginLoading(true);
    const result = await login(loginEmail, loginPassword);
    setLoginLoading(false);

    if (result.success && !result.needsSetup) {
      handleClose();
      const role = result.user?.role;
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "delivery") {
        navigate("/delivery");
      }
    } else if (result.needsSetup) {
      handleClose();
    } else if (!result.success) {
      setLoginError(result.message || "Login failed.");
    }
  };

  // ─── Sign Up Validation ───
  const validateSignup = () => {
    if (!signupName.trim()) return "Full name is required.";
    if (!signupEmail.trim()) return "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signupEmail)) return "Please enter a valid email.";
    if (!signupPassword) return "Password is required.";
    if (signupPassword.length < 6) return "Password must be at least 6 characters.";
    if (signupPassword !== signupConfirm) return "Passwords do not match.";
    return null;
  };

  // ─── Sign Up Submit ───
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupError("");

    const validation = validateSignup();
    if (validation) {
      setSignupError(validation);
      return;
    }

    setSignupLoading(true);
    const result = await signup(
      signupName,
      signupEmail,
      signupPhone,
      signupPassword,
      signupConfirm
    );
    setSignupLoading(false);

    if (result.success) {
      // Show success message, then switch to sign in tab
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setActiveTab("signin");
        // Keep login fields empty as requested
        setLoginEmail("");
        setLoginPassword("");
        // Clear signup fields
        setSignupName("");
        setSignupEmail("");
        setSignupPhone("");
        setSignupPassword("");
        setSignupConfirm("");
      }, 2500);
    } else {
      setSignupError(result.message || "Signup failed.");
    }
  };

  if (!showCustomerAuthModal) return null;

  return (
    <div className="cust-auth-overlay" onClick={handleClose}>
      <div className="cust-auth-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="cust-auth-close" onClick={handleClose}>
          <FaTimes />
        </button>

        {/* Success Animation Overlay */}
        {showSuccess && (
          <div className="cust-auth-success-overlay">
            <div className="cust-auth-success-icon">
              <FaCheckCircle />
            </div>
            <h2>Account Created Successfully!</h2>
            <p>Redirecting to Sign In...</p>
          </div>
        )}

        {/* Header */}
        <div className="cust-auth-header">
          <img src="/logo.png" alt="SGS Restaurant" className="cust-auth-logo" />
          <h2>SGS Gundu Palav</h2>
          <p>Sign in to continue ordering</p>
        </div>

        {/* Tab Switcher */}
        <div className="cust-auth-tabs">
          <button
            className={`cust-auth-tab ${activeTab === "signin" ? "cust-auth-tab-active" : ""}`}
            onClick={() => { setActiveTab("signin"); setLoginError(""); setSignupError(""); }}
          >
            <FaSignInAlt /> Sign In
          </button>
          <button
            className={`cust-auth-tab ${activeTab === "signup" ? "cust-auth-tab-active" : ""}`}
            onClick={() => { setActiveTab("signup"); setLoginError(""); setSignupError(""); }}
          >
            <FaUserPlus /> Sign Up
          </button>
        </div>

        {/* ═══ SIGN IN FORM ═══ */}
        {activeTab === "signin" && (
          <form onSubmit={handleLoginSubmit} className="cust-auth-form">
            <div className="cust-auth-input-group">
              <FaEnvelope className="cust-auth-input-icon" />
              <input
                type="email"
                placeholder="Email Address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="cust-auth-input-group">
              <FaLock className="cust-auth-input-icon" />
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="cust-auth-pw-toggle"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                tabIndex={-1}
              >
                {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {loginError && <div className="cust-auth-error">{loginError}</div>}

            <button
              type="submit"
              className="cust-auth-submit"
              disabled={loginLoading || authLoading}
            >
              {loginLoading || authLoading ? (
                <span className="cust-auth-spinner" />
              ) : (
                <>
                  <FaSignInAlt /> Sign In
                </>
              )}
            </button>

            <p className="cust-auth-switch">
              Don't have an account?{" "}
              <button type="button" onClick={() => { setActiveTab("signup"); setLoginError(""); }}>
                Create Account
              </button>
            </p>
          </form>
        )}

        {/* ═══ SIGN UP FORM ═══ */}
        {activeTab === "signup" && !showSuccess && (
          <form onSubmit={handleSignupSubmit} className="cust-auth-form">
            <div className="cust-auth-input-group">
              <FaUser className="cust-auth-input-icon" />
              <input
                type="text"
                placeholder="Full Name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                autoComplete="name"
                autoFocus
              />
            </div>

            <div className="cust-auth-input-group">
              <FaEnvelope className="cust-auth-input-icon" />
              <input
                type="email"
                placeholder="Email Address"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="cust-auth-input-group">
              <FaPhone className="cust-auth-input-icon" />
              <input
                type="tel"
                placeholder="Phone Number (optional)"
                value={signupPhone}
                maxLength={10}
                onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, ""))}
                autoComplete="tel"
              />
            </div>

            <div className="cust-auth-input-group">
              <FaLock className="cust-auth-input-icon" />
              <input
                type={showSignupPassword ? "text" : "password"}
                placeholder="Password (min 6 characters)"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="cust-auth-pw-toggle"
                onClick={() => setShowSignupPassword(!showSignupPassword)}
                tabIndex={-1}
              >
                {showSignupPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="cust-auth-input-group">
              <FaLock className="cust-auth-input-icon" />
              <input
                type={showSignupConfirm ? "text" : "password"}
                placeholder="Confirm Password"
                value={signupConfirm}
                onChange={(e) => setSignupConfirm(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="cust-auth-pw-toggle"
                onClick={() => setShowSignupConfirm(!showSignupConfirm)}
                tabIndex={-1}
              >
                {showSignupConfirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {signupError && <div className="cust-auth-error">{signupError}</div>}

            <button
              type="submit"
              className="cust-auth-submit cust-auth-submit-signup"
              disabled={signupLoading || authLoading}
            >
              {signupLoading || authLoading ? (
                <span className="cust-auth-spinner" />
              ) : (
                <>
                  <FaUserPlus /> Create Account
                </>
              )}
            </button>

            <p className="cust-auth-switch">
              Already have an account?{" "}
              <button type="button" onClick={() => { setActiveTab("signin"); setSignupError(""); }}>
                Sign In
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
