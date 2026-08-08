import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { AuthContext } from "../context/AuthContext";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSignInAlt,
} from "react-icons/fa";
import "../App.css";

export default function Login() {
  const { login, googleLogin } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    const result = await login(email, password);

    setLoading(false);

    if (result.success) {
      const role = result.user?.role;
      if (role === "admin") navigate("/admin");
      else if (role === "delivery") navigate("/delivery");
      else navigate("/");
    } else {
      setError(result.message || "Login failed.");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");

    const result = await googleLogin(credentialResponse.credential);

    if (result.success) {
      navigate("/");
    } else {
      setError(result.message || "Google login failed.");
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign-In failed.");
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        {/* Left Side */}
        <div className="auth-brand-section">
          <div className="auth-brand-content">
            <img
              src="/logo.png"
              alt="SGS Restaurant"
              className="auth-brand-logo"
            />

            <h1 className="auth-brand-title">
              SGS Gundu Palav
            </h1>

            <p className="auth-brand-subtitle">
              Since 1989
            </p>

            <p className="auth-brand-desc">
              Authentic South Indian taste crafted with tradition,
              rich spices, and heritage recipes.
            </p>
          </div>

          <div className="auth-brand-overlay"></div>
        </div>

        {/* Right Side */}
        <div className="auth-form-section">
          <div className="auth-form-wrapper">

            <div className="auth-form-header">
              <h2>Welcome Back</h2>
              <p>Sign in to continue ordering</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form" autoComplete="off">

              <div className="auth-input-group">
                <FaEnvelope className="auth-input-icon" />

                <input
                  type="email"
                  name="sgs_login_email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <div className="auth-input-group">
                <FaLock className="auth-input-icon" />

                <input
                  type={showPassword ? "text" : "password"}
                  name="sgs_login_pass"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  "Signing In..."
                ) : (
                  <>
                    <FaSignInAlt /> Sign In
                  </>
                )}
              </button>

            </form>

            <div className="auth-divider">
              <span>OR</span>
            </div>

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
                text="signin_with"
                width="320"
              />
            </div>

            <p className="auth-switch-text">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="auth-switch-link"
              >
                Sign Up
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}