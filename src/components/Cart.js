import React, { useContext, useState, useEffect, useCallback } from "react";
import { CartContext } from "../context/CartContext";
import { OrderContext } from "../context/OrderContext";
import { QRCodeSVG } from "qrcode.react";
import {
  FaShoppingBag,
  FaCheckCircle,
  FaTrash,
  FaPlus,
  FaMinus,
  FaShoppingBasket,
  FaTimes,
  FaMobileAlt,
  FaQrcode,
  FaShieldAlt,
  FaArrowLeft,
  FaMoneyBillWave,
  FaTruck,
  FaMapMarkerAlt,
  FaUser,
  FaPhone,
  FaEnvelope,
  FaSpinner,
  FaCrosshairs,
} from "react-icons/fa";
import "../App.css";

// ——— UPI CONFIG ———
const UPI_ID = "8431656808@axl";
const MERCHANT_NAME = "SGS Restaurant";

function buildUpiUrl(amount, orderId) {
  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: MERCHANT_NAME,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Order ${orderId}`,
  });
  return `upi://pay?${params.toString()}`;
}

export default function Cart() {
  const { cart, removeFromCart, updateQty, clearCart } = useContext(CartContext);
  const { addOrder } = useContext(OrderContext);

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState("details"); // details | choose | qr | cod | confirming | success
  const [orderId, setOrderId] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [paymentMethod, setPaymentMethod] = useState("");

  // Customer details state
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custLocation, setCustLocation] = useState("");
  const [custCoords, setCustCoords] = useState(null); // { lat, lng }
  const [custAreaName, setCustAreaName] = useState(""); // short locality
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [detailsErrors, setDetailsErrors] = useState({});

  const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);

  const handleCancelPayment = useCallback(() => {
    setShowPayment(false);
    setPaymentStep("details");
    setOrderId("");
    setPaymentMethod("");
  }, []);

  // Countdown timer for payment window
  useEffect(() => {
    if (!showPayment || paymentStep === "success") return;
    if (countdown <= 0) {
      handleCancelPayment();
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [showPayment, countdown, paymentStep, handleCancelPayment]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Detect location using browser Geolocation API + reverse geocoding
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setDetailsErrors((prev) => ({ ...prev, location: "Geolocation is not supported by your browser" }));
      return;
    }
    setDetectingLocation(true);
    setLocationDetected(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCustCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await res.json();
          if (data && data.display_name) {
            setCustLocation(data.display_name);
            // Extract a short area name
            const addr = data.address || {};
            const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.city || '';
            const city = addr.city || addr.state_district || addr.state || '';
            setCustAreaName(area && city ? `${area}, ${city}` : area || city || data.display_name.split(',').slice(0, 2).join(','));
          } else {
            setCustLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
            setCustAreaName('Location detected');
          }
        } catch {
          setCustLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setCustAreaName('Location detected');
        }
        setDetectingLocation(false);
        setLocationDetected(true);
        setDetailsErrors((prev) => ({ ...prev, location: undefined }));
      },
      (err) => {
        setDetectingLocation(false);
        setDetailsErrors((prev) => ({
          ...prev,
          location:
            err.code === 1
              ? "Location access denied. Please allow location or enter manually."
              : "Could not detect location. Please enter manually.",
        }));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Clear detected location (to re-detect or enter manually)
  const handleClearLocation = () => {
    setCustCoords(null);
    setCustLocation("");
    setCustAreaName("");
    setLocationDetected(false);
  };

  // Validate customer details
  const validateDetails = () => {
    const errs = {};
    if (!custName.trim()) errs.name = "Name is required";
    if (!custPhone.trim()) errs.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(custPhone.trim())) errs.phone = "Enter a valid 10-digit phone number";
    if (!custEmail.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custEmail.trim())) errs.email = "Enter a valid email";
    if (!custLocation.trim()) errs.location = "Delivery location is required";
    setDetailsErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToPayment = () => {
    if (!validateDetails()) return;
    setPaymentStep("choose");
  };

  const handleInitiatePayment = () => {
    if (cart.length === 0) return;
    const id = `ORD-${Date.now()}`;
    setOrderId(id);
    setCountdown(300);
    setPaymentStep("details");
    setShowPayment(true);
  };

  const handlePayWithApp = () => {
    const upiUrl = buildUpiUrl(total, orderId);
    window.location.href = upiUrl;
    // After redirect attempt, show QR as fallback after a short delay
    setTimeout(() => setPaymentStep("qr"), 1500);
  };

  const handleConfirmPayment = async (method = "upi") => {
    setPaymentMethod(method);
    setPaymentStep("confirming");
    // Simulate verification delay
    await new Promise((r) => setTimeout(r, method === "cod" ? 1200 : 1800));

    // Place orders with customer details
    cart.forEach((item) => {
      addOrder({
        item: item.name,
        price: item.price,
        qty: item.qty,
        total: item.price * item.qty,
        img: item.img,
        customer: custName.trim() || "Guest User",
        phone: custPhone.trim(),
        email: custEmail.trim(),
        location: custLocation.trim() || "Not provided",
        coords: custCoords || null, // { lat, lng } for Google Maps navigation
        paymentMethod: method,
      });
    });

    setPaymentStep("success");

    // Save customer phone for My Orders page auto-lookup
    if (custPhone.trim()) {
      localStorage.setItem("sgs_customer_phone", custPhone.trim());
    }

    // Auto-close after 3 seconds
    setTimeout(() => {
      clearCart();
      setShowPayment(false);
      setPaymentStep("details");
      setOrderId("");
      setPaymentMethod("");
      setCustName("");
      setCustPhone("");
      setCustEmail("");
      setCustLocation("");
      setCustCoords(null);
      setCustAreaName("");
      setLocationDetected(false);
    }, 3000);
  };

  const upiUrl = buildUpiUrl(total, orderId);

  return (
    <div className="cart-page-wrapper fade-in">
      <div className="cart-page">
        <h1 className="cart-title">
          <FaShoppingBasket /> Your Cart
        </h1>
        {cart.length === 0 ? (
          <div className="empty-cart-state">
            <FaShoppingBag />
            <p>Your cart is empty. Add items from the menu.</p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.name} className="cart-item">
                  <div className="cart-item-left">
                    <img src={item.img} alt={item.name} className="cart-item-img" />
                    <div className="cart-info">
                      <h3>{item.name}</h3>
                      <p className="cart-item-price">₹{item.price}</p>
                    </div>
                  </div>
                  <div className="cart-item-right">
                    <div className="qty-controls">
                      <button onClick={() => updateQty(item.name, item.qty - 1)}>
                        <FaMinus />
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.name, item.qty + 1)}>
                        <FaPlus />
                      </button>
                    </div>
                    <button className="remove-btn" onClick={() => removeFromCart(item.name)} title="Remove item">
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-summary-section">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>₹0.00</span>
              </div>
              <div className="summary-divider"></div>
              <div className="summary-row total-row">
                <span>Total Amount</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
              <div className="cart-actions">
                <button className="checkout-btn" onClick={handleInitiatePayment}>
                  <FaCheckCircle /> Pay ₹{total.toFixed(2)}
                </button>
                <button className="clear-btn" onClick={clearCart} title="Clear whole cart">
                  Clear All
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ═══════ UPI PAYMENT MODAL ═══════ */}
      {showPayment && (
        <div className="upi-overlay" onClick={handleCancelPayment}>
          <div className="upi-modal" onClick={(e) => e.stopPropagation()}>
            {/* CLOSE BTN */}
            {paymentStep !== "success" && paymentStep !== "confirming" && (
              <button className="upi-close-btn" onClick={handleCancelPayment}>
                <FaTimes />
              </button>
            )}

            {/* ────── STEP: CUSTOMER DETAILS ────── */}
            {paymentStep === "details" && (
              <div className="cust-details-step">
                <div className="upi-modal-header">
                  <div className="upi-amount-badge">₹{total.toFixed(2)}</div>
                  <h2>Delivery Details</h2>
                  <p className="upi-order-id">{orderId}</p>
                </div>

                <div className="cust-details-form">
                  <div className={`cust-field ${detailsErrors.name ? 'cust-field-error' : ''}`}>
                    <label><FaUser /> Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={custName}
                      onChange={(e) => { setCustName(e.target.value); setDetailsErrors(p => ({ ...p, name: undefined })); }}
                    />
                    {detailsErrors.name && <span className="cust-error">{detailsErrors.name}</span>}
                  </div>

                  <div className={`cust-field ${detailsErrors.phone ? 'cust-field-error' : ''}`}>
                    <label><FaPhone /> Phone Number</label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={custPhone}
                      maxLength={10}
                      onChange={(e) => { setCustPhone(e.target.value.replace(/\D/g, '')); setDetailsErrors(p => ({ ...p, phone: undefined })); }}
                    />
                    {detailsErrors.phone && <span className="cust-error">{detailsErrors.phone}</span>}
                  </div>

                  <div className={`cust-field ${detailsErrors.email ? 'cust-field-error' : ''}`}>
                    <label><FaEnvelope /> Email Address</label>
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={custEmail}
                      onChange={(e) => { setCustEmail(e.target.value); setDetailsErrors(p => ({ ...p, email: undefined })); }}
                    />
                    {detailsErrors.email && <span className="cust-error">{detailsErrors.email}</span>}
                  </div>

                  {/* ── GPS LOCATION PICKER ── */}
                  <div className={`cust-field ${detailsErrors.location ? 'cust-field-error' : ''}`}>
                    <label><FaMapMarkerAlt /> Delivery Location</label>

                    {!locationDetected && !detectingLocation && (
                      <div className="gps-picker-card">
                        <button
                          type="button"
                          className="gps-use-current-btn"
                          onClick={handleDetectLocation}
                        >
                          <div className="gps-pulse-ring"></div>
                          <FaCrosshairs className="gps-icon" />
                          <div className="gps-btn-text">
                            <span className="gps-btn-title">Use Current Location</span>
                            <span className="gps-btn-sub">Using GPS</span>
                          </div>
                        </button>

                        <div className="gps-divider">
                          <span className="gps-divider-line"></span>
                          <span className="gps-divider-text">OR</span>
                          <span className="gps-divider-line"></span>
                        </div>

                        <textarea
                          className="gps-manual-input"
                          placeholder="Type your full delivery address here...&#10;E.g., 123, MG Road, Koramangala, Bengaluru - 560034"
                          value={custLocation}
                          rows={3}
                          onChange={(e) => { setCustLocation(e.target.value); setDetailsErrors(p => ({ ...p, location: undefined })); }}
                        />
                      </div>
                    )}

                    {detectingLocation && (
                      <div className="gps-detecting-card">
                        <div className="gps-detecting-anim">
                          <div className="gps-wave gps-wave-1"></div>
                          <div className="gps-wave gps-wave-2"></div>
                          <div className="gps-wave gps-wave-3"></div>
                          <FaCrosshairs className="gps-detecting-icon" />
                        </div>
                        <p className="gps-detecting-text">Detecting your location...</p>
                        <p className="gps-detecting-sub">Please allow location access if prompted</p>
                      </div>
                    )}

                    {locationDetected && custCoords && (
                      <div className="gps-result-card">
                        <div className="gps-map-container">
                          <iframe
                            title="Delivery Location Map"
                            className="gps-map-iframe"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${custCoords.lng - 0.005},${custCoords.lat - 0.003},${custCoords.lng + 0.005},${custCoords.lat + 0.003}&layer=mapnik&marker=${custCoords.lat},${custCoords.lng}`}
                            loading="lazy"
                          />
                          <div className="gps-map-overlay-badge">
                            <FaMapMarkerAlt /> Live Location
                          </div>
                        </div>

                        <div className="gps-address-section">
                          <div className="gps-address-top">
                            <div className="gps-pin-icon-wrap">
                              <FaMapMarkerAlt />
                            </div>
                            <div className="gps-address-info">
                              <h4 className="gps-area-name">{custAreaName}</h4>
                              <p className="gps-full-address">{custLocation}</p>
                            </div>
                          </div>
                          <button type="button" className="gps-change-btn" onClick={handleClearLocation}>
                            Change
                          </button>
                        </div>

                        <textarea
                          className="gps-extra-input"
                          placeholder="Add floor / flat / landmark (optional)"
                          rows={2}
                        />
                      </div>
                    )}

                    {detailsErrors.location && <span className="cust-error">{detailsErrors.location}</span>}
                  </div>
                </div>

                <button className="upi-confirm-btn cust-proceed-btn" onClick={handleProceedToPayment}>
                  <FaCheckCircle /> Continue to Payment
                </button>

                <div className="upi-secure-badge">
                  <FaShieldAlt /> Your information is secure
                </div>
              </div>
            )}

            {/* ────── STEP: CHOOSE ────── */}
            {paymentStep === "choose" && (
              <div className="upi-choose-step">
                <button className="upi-back-btn" onClick={() => setPaymentStep("details")}>
                  <FaArrowLeft /> Back
                </button>

                <div className="upi-modal-header">
                  <div className="upi-amount-badge">₹{total.toFixed(2)}</div>
                  <h2>Choose Payment Method</h2>
                  <p className="upi-order-id">{orderId}</p>
                </div>

                <div className="cust-summary-strip">
                  <span><FaUser /> {custName}</span>
                  <span><FaPhone /> {custPhone}</span>
                  <span><FaMapMarkerAlt /> {custLocation.length > 35 ? custLocation.slice(0, 35) + '…' : custLocation}</span>
                </div>

                <div className="upi-options">
                  <button className="upi-option-btn upi-app-btn" onClick={handlePayWithApp}>
                    <FaMobileAlt />
                    <div>
                      <span className="upi-opt-title">Pay with UPI App</span>
                      <span className="upi-opt-desc">GPay, PhonePe, Paytm, etc.</span>
                    </div>
                  </button>

                  <button className="upi-option-btn upi-qr-btn" onClick={() => setPaymentStep("qr")}>
                    <FaQrcode />
                    <div>
                      <span className="upi-opt-title">Scan QR Code</span>
                      <span className="upi-opt-desc">Scan with any UPI app</span>
                    </div>
                  </button>

                  <div className="upi-divider-row">
                    <span className="upi-divider-line"></span>
                    <span className="upi-divider-text">OR</span>
                    <span className="upi-divider-line"></span>
                  </div>

                  <button className="upi-option-btn upi-cod-btn" onClick={() => setPaymentStep("cod")}>
                    <FaMoneyBillWave />
                    <div>
                      <span className="upi-opt-title">Cash on Delivery</span>
                      <span className="upi-opt-desc">Pay when your order arrives</span>
                    </div>
                  </button>
                </div>

                <div className="upi-secure-badge">
                  <FaShieldAlt /> Secure UPI Payment
                </div>
              </div>
            )}

            {/* ────── STEP: QR CODE ────── */}
            {paymentStep === "qr" && (
              <div className="upi-qr-step">
                <button className="upi-back-btn" onClick={() => setPaymentStep("choose")}>
                  <FaArrowLeft /> Back
                </button>

                <div className="upi-modal-header">
                  <div className="upi-amount-badge">₹{total.toFixed(2)}</div>
                  <h2>Scan & Pay</h2>
                  <p className="upi-order-id">{orderId}</p>
                </div>

                <div className="upi-qr-card">
                  <div className="upi-qr-wrapper">
                    <QRCodeSVG
                      value={upiUrl}
                      size={200}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#1e293b"
                    />
                  </div>
                  <p className="upi-id-display">
                    UPI ID: <strong>{UPI_ID}</strong>
                  </p>
                </div>

                <div className="upi-timer">
                  <span className={countdown <= 60 ? "upi-timer-warn" : ""}>
                    ⏱ Expires in {formatTime(countdown)}
                  </span>
                </div>

                <div className="upi-instructions">
                  <p>1. Open any UPI app on your phone</p>
                  <p>2. Scan the QR code above</p>
                  <p>3. Confirm the payment of ₹{total.toFixed(2)}</p>
                  <p>4. Click the button below after paying</p>
                </div>

                <button className="upi-confirm-btn" onClick={handleConfirmPayment}>
                  <FaCheckCircle /> I've Completed the Payment
                </button>

                <div className="upi-secure-badge">
                  <FaShieldAlt /> Secure UPI Payment
                </div>
              </div>
            )}

            {/* ────── STEP: COD ────── */}
            {paymentStep === "cod" && (
              <div className="upi-cod-step">
                <button className="upi-back-btn" onClick={() => setPaymentStep("choose")}>
                  <FaArrowLeft /> Back
                </button>

                <div className="upi-modal-header">
                  <div className="upi-amount-badge cod-badge">₹{total.toFixed(2)}</div>
                  <h2>Cash on Delivery</h2>
                  <p className="upi-order-id">{orderId}</p>
                </div>

                <div className="cod-info-card">
                  <div className="cod-info-row">
                    <FaTruck className="cod-info-icon" />
                    <div>
                      <span className="cod-info-title">Free Delivery</span>
                      <span className="cod-info-desc">Estimated 30–45 minutes</span>
                    </div>
                  </div>
                  <div className="cod-info-row">
                    <FaMapMarkerAlt className="cod-info-icon" />
                    <div>
                      <span className="cod-info-title">Delivery Address</span>
                      <span className="cod-info-desc">{custLocation || 'Not provided'}</span>
                    </div>
                  </div>
                  <div className="cod-info-row">
                    <FaMoneyBillWave className="cod-info-icon" />
                    <div>
                      <span className="cod-info-title">Pay ₹{total.toFixed(2)}</span>
                      <span className="cod-info-desc">Cash or UPI at doorstep</span>
                    </div>
                  </div>
                </div>

                <div className="cod-note">
                  <p>💡 Please keep exact change ready for a smooth delivery experience.</p>
                </div>

                <button className="upi-confirm-btn cod-confirm-btn" onClick={() => handleConfirmPayment("cod")}>
                  <FaCheckCircle /> Confirm Order
                </button>

                <div className="upi-secure-badge">
                  <FaShieldAlt /> Pay safely at your doorstep
                </div>
              </div>
            )}

            {/* ────── STEP: CONFIRMING ────── */}
            {paymentStep === "confirming" && (
              <div className="upi-confirming-step">
                <div className="upi-spinner-ring"></div>
                <h2>{paymentMethod === "cod" ? "Placing Your Order..." : "Verifying Payment..."}</h2>
                <p>{paymentMethod === "cod" ? "Please wait while we confirm your order" : "Please wait while we confirm your payment"}</p>
                <p className="upi-order-id">{orderId}</p>
              </div>
            )}

            {/* ────── STEP: SUCCESS ────── */}
            {paymentStep === "success" && (
              <div className="upi-success-step">
                <div className={`upi-success-icon ${paymentMethod === "cod" ? "cod-success-icon" : ""}`}>
                  <FaCheckCircle />
                </div>
                <h2>{paymentMethod === "cod" ? "Order Confirmed!" : "Payment Successful!"}</h2>
                <p className="upi-success-amount">₹{total.toFixed(2)}</p>
                <p>{paymentMethod === "cod" ? "Your order will be delivered soon. Pay at your doorstep." : "Your order has been placed successfully."}</p>
                <p className="upi-order-id">{orderId}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
