import React, { useState, useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  FaTimes, FaUserShield, FaTruck, FaEnvelope, FaLock, FaEye, FaEyeSlash,
  FaUser, FaPhone, FaMapMarkerAlt, FaSpinner, FaCheckCircle, FaMotorcycle,
} from "react-icons/fa";
import "../App.css";

export default function LoginModal() {
  const {
    showLoginModal, setShowLoginModal, login,
    showDeliverySetup, completeDeliveryLogin, cancelDeliverySetup, loading: authLoading
  } = useContext(AuthContext);
  const navigate = useNavigate();

  // Login fields
  const [loginRole, setLoginRole] = useState("admin"); // "admin" | "delivery"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Delivery setup fields
  const [dpName, setDpName] = useState("");
  const [dpPhone, setDpPhone] = useState("");
  const [dpLocation, setDpLocation] = useState(null);
  const [dpLocationAddress, setDpLocationAddress] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [setupError, setSetupError] = useState("");

  // Geolocation for delivery partner
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setDpLocation(coords);
        setDpLocationAddress(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError("Location permission denied. Please allow location access and try again.");
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable.");
            break;
          case err.TIMEOUT:
            setLocationError("Location request timed out. Try again.");
            break;
          default:
            setLocationError("Unable to get your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // Auto-request location when delivery setup appears
  useEffect(() => {
    if (showDeliverySetup) requestLocation();
  }, [showDeliverySetup, requestLocation]);

  if (!showLoginModal && !showDeliverySetup) return null;

  const resetFields = () => {
    setEmail("");
    setPassword("");
    setError("");
    setSuccess("");
    setShowPassword(false);
  };

  // ─── Login Submit ───
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success && !result.needsSetup) {
      setError(result.message);
    } else if (result.success && !result.needsSetup) {
      resetFields();
      const role = result.user?.role;
      if (role === "admin") navigate("/admin");
      else if (role === "delivery") navigate("/delivery");
      else navigate("/");
    }
  };

  // ─── Delivery Setup Submit ───
  const handleDeliverySetupSubmit = () => {
    if (!dpName.trim()) { setSetupError("Please enter your name."); return; }
    if (!dpPhone.trim() || !/^[6-9]\d{9}$/.test(dpPhone.trim())) {
      setSetupError("Please enter a valid 10-digit phone number."); return;
    }
    if (!dpLocation) { setSetupError("Please allow location access to continue."); return; }

    setSetupError("");
    completeDeliveryLogin(dpName.trim(), dpPhone.trim(), dpLocation);
    setDpName(""); setDpPhone(""); setDpLocation(null); setDpLocationAddress("");
    navigate("/delivery");
  };

  const handleClose = () => {
    if (showDeliverySetup) {
      cancelDeliverySetup();
    } else {
      setShowLoginModal(false);
    }
    resetFields();
    setDpName(""); setDpPhone(""); setDpLocation(null);
    setDpLocationAddress(""); setSetupError(""); setLocationError("");
  };

  // ═══════════════════════════════════
  // DELIVERY SETUP MODAL
  // ═══════════════════════════════════
  if (showDeliverySetup) {
    return (
      <div className="login-overlay" onClick={handleClose}>
        <div className="login-modal delivery-setup-modal" onClick={(e) => e.stopPropagation()}>
          <button className="login-close" onClick={handleClose}><FaTimes /></button>
          <div className="login-header">
            <div className="delivery-setup-icon-wrap">
              <FaMotorcycle className="delivery-setup-header-icon" />
            </div>
            <h2>Delivery Partner Setup</h2>
            <p>Enter your details to start delivering</p>
          </div>
          <div className="delivery-setup-form">
            <div className="login-input-group">
              <FaUser className="login-input-icon" />
              <input type="text" placeholder="Your Full Name" value={dpName}
                onChange={(e) => setDpName(e.target.value)} autoFocus />
            </div>
            <div className="login-input-group">
              <FaPhone className="login-input-icon" />
              <input type="tel" placeholder="Your 10-digit Phone Number" value={dpPhone}
                maxLength={10} onChange={(e) => setDpPhone(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="delivery-location-section">
              <h4 className="delivery-location-title"><FaMapMarkerAlt /> Your Current Location</h4>
              {locationLoading && (
                <div className="delivery-location-loading">
                  <FaSpinner className="spin-icon" /><span>Getting your location...</span>
                </div>
              )}
              {dpLocation && (
                <div className="delivery-location-success">
                  <FaCheckCircle className="location-success-icon" />
                  <div>
                    <p className="location-coords">{dpLocationAddress}</p>
                    <p className="location-hint">Location captured successfully!</p>
                  </div>
                </div>
              )}
              {locationError && (
                <div className="delivery-location-error">
                  <p>{locationError}</p>
                  <button className="retry-location-btn" onClick={requestLocation}>
                    <FaMapMarkerAlt /> Retry Location
                  </button>
                </div>
              )}
              {!dpLocation && !locationLoading && !locationError && (
                <button className="get-location-btn" onClick={requestLocation}>
                  <FaMapMarkerAlt /> Get My Location
                </button>
              )}
            </div>
            {setupError && <div className="login-error">{setupError}</div>}
            <button className="login-submit delivery-setup-submit" onClick={handleDeliverySetupSubmit}
              disabled={!dpName.trim() || !dpPhone.trim() || !dpLocation}>
              <FaMotorcycle /> Start Delivering
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════
  // LOGIN VIEW
  // ═══════════════════════════════════
  return (
    <div className="login-overlay" onClick={handleClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="login-close" onClick={handleClose}><FaTimes /></button>

        {/* Header */}
        <div className="login-header">
          <div className="auth-icon-circle login-icon-circle">
            {loginRole === "admin" ? <FaUserShield /> : <FaTruck />}
          </div>
          <h2>Staff Sign In</h2>
          <p>Select your panel and sign in</p>
        </div>

        {/* Panel Selector: Admin | Delivery */}
        <div className="role-selector">
          <button
            className={`role-btn ${loginRole === "admin" ? "role-active" : ""}`}
            onClick={() => { setLoginRole("admin"); setError(""); }}
            type="button"
          >
            <FaUserShield /><span>Admin Panel</span>
          </button>
          <button
            className={`role-btn ${loginRole === "delivery" ? "role-active" : ""}`}
            onClick={() => { setLoginRole("delivery"); setError(""); }}
            type="button"
          >
            <FaTruck /><span>Delivery Panel</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLoginSubmit} className="login-form">
          <div className="login-input-group">
            <FaEnvelope className="login-input-icon" />
            <input type="email" placeholder="Email Address" value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
          </div>

          <div className="login-input-group">
            <FaLock className="login-input-icon" />
            <input type={showPassword ? "text" : "password"} placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" />
            <button type="button" className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          <button
            type="submit"
            className={`login-submit ${loginRole === "delivery" ? "delivery-submit-btn" : ""}`}
            disabled={loading || authLoading}
          >
            {loading || authLoading ? (
              <span className="login-spinner"></span>
            ) : loginRole === "admin" ? (
              <><FaUserShield /> Sign In as Admin</>
            ) : (
              <><FaTruck /> Sign In as Delivery</>
            )}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="login-demo-hint">
          {loginRole === "admin" ? (
            <p><strong>Admin Logins:</strong> admin@sgs.com / admin123 &bull; admin2@sgs.com / admin123 &bull; pavan@sgs.com / pavan123</p>
          ) : (
            <p><strong>Delivery Logins:</strong> delivery1@sgs.com &ndash; delivery4@sgs.com / delivery123</p>
          )}
        </div>
      </div>
    </div>
  );
}
