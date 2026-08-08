import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaUserPlus,
} from "react-icons/fa";
import { GoogleLogin } from "@react-oauth/google";
import "../App.css";



export default function Signup() {
  const { signup, googleLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  // ─── Client-side validation ───
  const validate = () => {
    if (!name.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  // ─── Signup Submit ───
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    const result = await signup(name, email, phone, password, confirmPassword);
    setLoading(false);
    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Signup failed.");
    }
  };


  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");

    const result = await googleLogin(credentialResponse.credential);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Google signup failed.");
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign-In failed.");
  };



  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left side — branding */}
        <div className="auth-brand-section">
          <div className="auth-brand-content">
            <img
              src="/logo.png"
              alt="SGS Restaurant"
              className="auth-brand-logo"
            />
            <h1 className="auth-brand-title">SGS Gundu Palav</h1>
            <p className="auth-brand-subtitle">Since 1989</p>
            <p className="auth-brand-desc">
              Join us and experience the finest South Indian cuisine delivered to
              your doorstep.
            </p>
          </div>
          <div className="auth-brand-overlay" />
        </div>

        {/* Right side — form */}
        <div className="auth-form-section">
          <div className="auth-form-wrapper">
            <div className="auth-form-header">
              <h2>Create Account</h2>
              <p>Sign up to start ordering</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-input-group">
                <FaUser className="auth-input-icon" />
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  autoFocus
                />
              </div>

              <div className="auth-input-group">
                <FaEnvelope className="auth-input-icon" />
                <input
                  id="signup-email"
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="auth-input-group">
                <FaPhone className="auth-input-icon" />
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={phone}
                  maxLength={10}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, ""))
                  }
                  autoComplete="tel"
                />
              </div>

              <div className="auth-input-group">
                <FaLock className="auth-input-icon" />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="auth-input-group">
                <FaLock className="auth-input-icon" />
                <input
                  id="signup-confirm-password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <button
                id="signup-submit"
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="auth-btn-spinner" />
                ) : (
                  <>
                    <FaUserPlus /> Create Account
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="auth-divider">
              <span>or</span>
            </div>

            {/* Google Signup */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                shape="pill"
                size="large"
                text="signup_with"
                width="320"
              />
            </div>

            {/* Login link */}
            <p className="auth-switch-text">
              Already have an account?{" "}
              <Link to="/login" className="auth-switch-link">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
