import React, { useContext, useState, useEffect, useCallback, useRef } from "react";
import { CartContext } from "../context/CartContext";
import { OrderContext } from "../context/OrderContext";
import { AuthContext } from "../context/AuthContext";
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
  FaCreditCard,
  FaSearch,
  FaHome,
} from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../App.css";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Bangalore center coordinates (default map location)
const RESTAURANT_COORDS = { lat: 12.9716, lng: 77.5946 };

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
  const { user, setShowCustomerAuthModal } = useContext(AuthContext);

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState("details"); // details | choose | qr | cod | confirming | success
  const [orderId, setOrderId] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [paymentMethod, setPaymentMethod] = useState("");
  const [razorpayError, setRazorpayError] = useState("");
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  // Customer details state - auto-fill from AuthContext user if logged in
  const [custName, setCustName] = useState(user?.name || "");
  const [custPhone, setCustPhone] = useState(user?.phone || "");
  const [custEmail, setCustEmail] = useState(user?.email || "");
  const [custDoorNo, setCustDoorNo] = useState("");
  const [custLocation, setCustLocation] = useState("");
  const [custCoords, setCustCoords] = useState(null); // { lat, lng }
  const [custAreaName, setCustAreaName] = useState(""); // short locality
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [detailsErrors, setDetailsErrors] = useState({});

  // Address search & map state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Caching & map refs
  const reverseGeocodeCache = useRef({});
  const searchCacheRef = useRef({});
  const debounceTimerRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Sync profile details if user state updates
  useEffect(() => {
    if (user) {
      if (user.name) setCustName(user.name);
      if (user.phone) setCustPhone(user.phone);
      if (user.email) setCustEmail(user.email);
    }
  }, [user]);

  // Load Razorpay checkout.js script once
  useEffect(() => {
    if (document.getElementById("razorpay-checkout-script")) return;
    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      // Leave script in DOM to avoid re-loading on re-render
    };
  }, []);

  const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);

  const handleCancelPayment = useCallback(() => {
    setShowPayment(false);
    setPaymentStep("details");
    setOrderId("");
    setPaymentMethod("");
    setRazorpayError("");
    setRazorpayLoading(false);
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

  // Reverse-geocode coordinates to readable address (with cache)
  const reverseGeocode = useCallback(async (lat, lng) => {
    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (reverseGeocodeCache.current[key]) {
      return reverseGeocodeCache.current[key];
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const house = addr.house_number || addr.building || "";
        const road = addr.road || addr.street || addr.pedestrian || "";
        const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || "";
        const city = addr.city || addr.state_district || addr.county || "";
        const state = addr.state || "";
        const pincode = addr.postcode || "";

        const parts = [house, road, area, city, state, pincode].filter(Boolean);
        const formatted = parts.length > 0 ? parts.join(", ") : data.display_name;

        const result = { displayName: formatted, fullDetails: data };
        reverseGeocodeCache.current[key] = result;
        return result;
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
    return { displayName: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  }, []);

  // Debounced Nominatim Address Search (min 3 chars, cache, duplicate prevention)
  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      const cleanQuery = query.trim().toLowerCase();
      if (searchCacheRef.current[cleanQuery]) {
        setSearchResults(searchCacheRef.current[cleanQuery]);
        setIsSearching(false);
        return;
      }

      try {
        const viewboxParam = `&viewbox=${RESTAURANT_COORDS.lng - 0.5},${RESTAURANT_COORDS.lat + 0.5},${RESTAURANT_COORDS.lng + 0.5},${RESTAURANT_COORDS.lat - 0.5}`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5${viewboxParam}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Search request failed");
        const data = await res.json();

        searchCacheRef.current[cleanQuery] = data;
        setSearchResults(data);
      } catch (err) {
        console.error("Address search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  };

  // Select a search result
  const handleSelectSearchResult = async (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const coordsObj = { lat, lng };
    setCustCoords(coordsObj);
    setCustLocation(result.display_name);

    const addr = result.address || {};
    const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.city || '';
    const city = addr.city || addr.state_district || addr.state || '';
    setCustAreaName(area && city ? `${area}, ${city}` : area || city || result.display_name.split(',').slice(0, 2).join(','));

    setSearchResults([]);
    setSearchQuery("");
    setLocationConfirmed(false);
    setDetailsErrors((prev) => ({ ...prev, location: undefined }));
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (paymentStep !== "details" || !showPayment) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    let mapTimer = null;
    let resizeTimer = null;

    mapTimer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }

      const initialLat = custCoords?.lat || RESTAURANT_COORDS.lat;
      const initialLng = custCoords?.lng || RESTAURANT_COORDS.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: custCoords ? 16 : 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        autoPan: true,
      }).addTo(map);

      markerRef.current = marker;
      mapInstanceRef.current = map;

      // Ensure Leaflet map recalculates container dimensions properly
      map.invalidateSize();
      resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);

      // Dragend listener (reverse-geocodes ONLY on dragend)
      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        const coordsObj = { lat: pos.lat, lng: pos.lng };
        setCustCoords(coordsObj);
        setLocationConfirmed(false);

        const geoResult = await reverseGeocode(pos.lat, pos.lng);
        setCustLocation(geoResult.displayName);

        const addr = geoResult.fullDetails?.address || {};
        const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.city || '';
        const city = addr.city || addr.state_district || addr.state || '';
        setCustAreaName(area && city ? `${area}, ${city}` : area || city || geoResult.displayName.split(',').slice(0, 2).join(','));
        setDetailsErrors((prev) => ({ ...prev, location: undefined }));
      });

      // Map click listener to reposition marker
      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        const coordsObj = { lat, lng };
        setCustCoords(coordsObj);
        setLocationConfirmed(false);

        const geoResult = await reverseGeocode(lat, lng);
        setCustLocation(geoResult.displayName);

        const addr = geoResult.fullDetails?.address || {};
        const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.city || '';
        const city = addr.city || addr.state_district || addr.state || '';
        setCustAreaName(area && city ? `${area}, ${city}` : area || city || geoResult.displayName.split(',').slice(0, 2).join(','));
        setDetailsErrors((prev) => ({ ...prev, location: undefined }));
      });
    }, 150);

    return () => {
      if (mapTimer) clearTimeout(mapTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStep, showPayment, reverseGeocode]);

  // Synchronize Leaflet map view & marker when custCoords update externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current && custCoords?.lat && custCoords?.lng) {
      const { lat, lng } = custCoords;
      markerRef.current.setLatLng([lat, lng]);
      mapInstanceRef.current.setView([lat, lng], 16);
    }
  }, [custCoords]);

  // Detect location using browser Geolocation API
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setDetailsErrors((prev) => ({ ...prev, location: "Geolocation is not supported by your browser." }));
      return;
    }
    setDetectingLocation(true);
    setLocationConfirmed(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordsObj = { lat: latitude, lng: longitude };
        setCustCoords(coordsObj);

        const geoResult = await reverseGeocode(latitude, longitude);
        setCustLocation(geoResult.displayName);

        const addr = geoResult.fullDetails?.address || {};
        const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.city || '';
        const city = addr.city || addr.state_district || addr.state || '';
        setCustAreaName(area && city ? `${area}, ${city}` : area || city || geoResult.displayName.split(',').slice(0, 2).join(','));

        setDetectingLocation(false);
        setDetailsErrors((prev) => ({ ...prev, location: undefined }));
      },
      (err) => {
        setDetectingLocation(false);
        let errMsg = "Could not detect location. Please search address or pick on map.";
        if (err.code === 1) {
          errMsg = "Location permission denied. Please allow access or search address below.";
        } else if (err.code === 2) {
          errMsg = "GPS position unavailable. Please search address or pick on map.";
        } else if (err.code === 3) {
          errMsg = "Location request timed out. Please try again or search address.";
        }
        setDetailsErrors((prev) => ({ ...prev, location: errMsg }));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleConfirmLocation = () => {
    const effectiveLoc = (custLocation || searchQuery).trim();
    if (!effectiveLoc) {
      setDetailsErrors((prev) => ({ ...prev, location: "Please enter your delivery location (door No., floor, street) or pick on map first." }));
      return;
    }
    if (!custLocation) {
      setCustLocation(effectiveLoc);
      setCustAreaName(effectiveLoc.split(',')[0]);
    }
    if (!custCoords) {
      setCustCoords(RESTAURANT_COORDS);
    }
    setLocationConfirmed(true);
    setDetailsErrors((prev) => ({ ...prev, location: undefined }));
  };

  const handleClearLocation = () => {
    setCustCoords(null);
    setCustLocation("");
    setCustAreaName("");
    setLocationConfirmed(false);
  };

  // Validate customer details
  const validateDetails = () => {
    const errs = {};
    if (!custName.trim()) errs.name = "Full name is required";
    if (!custPhone.trim()) errs.phone = "Phone number is required";
    else if (!/^[6-9]\d{9}$/.test(custPhone.trim())) errs.phone = "Enter a valid 10-digit mobile number";
    if (!custEmail.trim()) errs.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(custEmail.trim())) errs.email = "Enter a valid email address";

    if (!custDoorNo.trim()) {
      errs.doorNo = "Door No. and Floor details are required";
    }

    const effectiveLoc = (custLocation || searchQuery).trim();
    if (!effectiveLoc) {
      errs.location = "Delivery location is required. Please search or pick a location on map.";
    } else if (!locationConfirmed) {
      errs.location = "Please click 'Confirm Delivery Location' to confirm your address before proceeding to payment.";
    }
    setDetailsErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleProceedToPayment = () => {
    if (!validateDetails()) return;
    setPaymentStep("choose");
  };

  const handleInitiatePayment = () => {
    if (cart.length === 0) return;
    if (!user) {
      setShowCustomerAuthModal(true);
      return;
    }
    if (user) {
      if (user.name) setCustName(user.name);
      if (user.phone) setCustPhone(user.phone);
      if (user.email) setCustEmail(user.email);
    }
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

  // ── Razorpay Standard Checkout ──────────────────────────────────────────────
  const handlePayWithRazorpay = async () => {
    setRazorpayError("");
    setRazorpayLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const amountPaise = Math.round(total * 100); // convert ₹ to paise

      // Step 1: Create order on backend
      const orderRes = await fetch(`${API_URL}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: orderId,
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create payment order. Is the server running?");
      }

      const { order_id, amount, currency } = await orderRes.json();

      // Step 2: Open Razorpay modal
      if (!window.Razorpay) {
        throw new Error("Razorpay script not loaded. Please refresh and try again.");
      }

      const rzpOptions = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "SGS Restaurant",
        description: `Order ${orderId}`,
        order_id,
        prefill: {
          name: custName,
          email: custEmail,
          contact: custPhone,
        },
        theme: { color: "#e8a33d" },
        modal: {
          ondismiss: () => {
            setRazorpayLoading(false);
            setRazorpayError("Payment was cancelled. Please try again.");
          },
        },
        handler: async (response) => {
          // Step 3: Verify signature on backend
          try {
            const verifyRes = await fetch(`${API_URL}/verify-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              // Payment verified — confirm order
              setRazorpayLoading(false);
              handleConfirmPayment("razorpay", response.razorpay_payment_id);
            } else {
              setRazorpayLoading(false);
              setRazorpayError("Payment verification failed. Please contact support with your payment ID: " + response.razorpay_payment_id);
            }
          } catch (verifyErr) {
            setRazorpayLoading(false);
            setRazorpayError("Could not verify payment. Please contact support.");
          }
        },
      };

      // Listen for payment failure
      const rzp = new window.Razorpay(rzpOptions);
      rzp.on("payment.failed", (response) => {
        setRazorpayLoading(false);
        setRazorpayError(
          `Payment failed: ${response.error.description || "Unknown error"}. Code: ${response.error.code}`
        );
      });

      setRazorpayLoading(false);
      rzp.open();
    } catch (err) {
      setRazorpayLoading(false);
      setRazorpayError(err.message || "Something went wrong. Please try again.");
    }
  };

  const handleConfirmPayment = async (method = "upi", transactionId = null) => {
    setPaymentMethod(method);
    setPaymentStep("confirming");
    // Brief delay for non-Razorpay methods to show confirming state
    await new Promise((r) => setTimeout(r, method === "cod" ? 1200 : method === "razorpay" ? 500 : 1800));

    // Place ONE combined order with all cart items bundled together
    const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
    addOrder({
      items: cart.map((i) => ({
        name: i.name,
        price: i.price,
        qty: i.qty,
        total: i.price * i.qty,
        img: i.img,
      })),
      item: cart.length > 1 ? `${cart.length} items` : cart[0].name,
      price: total,
      qty: totalQty,
      total: total,
      img: cart[0].img,
      customer: custName.trim() || "Guest User",
      phone: custPhone.trim(),
      email: custEmail.trim(),
      location: custDoorNo.trim() ? `${custDoorNo.trim()}, ${custLocation.trim()}` : (custLocation.trim() || "Not provided"),
      coords: custCoords || null,
      paymentMethod: method,
      ...(transactionId ? { transactionId } : {}),
      ...(method === "razorpay" ? { paymentReceived: true } : {}),
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
      setRazorpayError("");
      setCustName("");
      setCustPhone("");
      setCustEmail("");
      setCustDoorNo("");
      setCustLocation("");
      setCustCoords(null);
      setCustAreaName("");
      setLocationConfirmed(false);
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

                  <div className={`cust-field ${detailsErrors.doorNo ? 'cust-field-error' : ''}`}>
                    <label><FaHome /> Door No., Floor & Building Details</label>
                    <input
                      type="text"
                      placeholder="Please enter door No. , Floor....."
                      value={custDoorNo}
                      onChange={(e) => { setCustDoorNo(e.target.value); setDetailsErrors(p => ({ ...p, doorNo: undefined })); }}
                    />
                    {detailsErrors.doorNo && <span className="cust-error">{detailsErrors.doorNo}</span>}
                  </div>

                  {/* ── INTERACTIVE LOCATION PICKER ── */}
                  <div className={`cust-field ${detailsErrors.location ? 'cust-field-error' : ''}`}>
                    <label><FaMapMarkerAlt /> Delivery Location</label>

                    <div className="loc-picker-wrapper">
                      {/* 1. Address Search Bar */}

                      {/* Search suggestions dropdown */}
                      {searchResults.length > 0 && (
                        <div className="loc-search-results">
                          {searchResults.map((res, idx) => (
                            <div
                              key={idx}
                              className="loc-search-item"
                              onClick={() => handleSelectSearchResult(res)}
                            >
                              <FaMapMarkerAlt className="loc-item-icon" />
                              <span className="loc-item-text">{res.display_name}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2. GPS Button */}
                      <button
                        type="button"
                        className="loc-use-gps-btn"
                        onClick={handleDetectLocation}
                        disabled={detectingLocation}
                      >
                        <FaCrosshairs className={`loc-gps-icon ${detectingLocation ? 'spin-icon' : ''}`} />
                        <span>{detectingLocation ? "Detecting your location..." : "📍 Use My Current Location"}</span>
                      </button>

                      {/* 3. Interactive Leaflet Map Container */}
                      <div className="loc-map-wrapper">
                        <div ref={mapContainerRef} className="loc-map-container" id="checkout-location-map"></div>
                        <div className="loc-map-hint">
                          💡 Drag marker or click map to pinpoint exact delivery spot
                        </div>
                      </div>

                      {/* 4. Location Details & Confirmation Box */}
                      {custLocation ? (
                        <div className="loc-address-box">
                          <div className="loc-address-info">
                            <FaMapMarkerAlt className="loc-pin-badge" />
                            <div className="loc-address-text">
                              <h4 className="loc-area-name">{custAreaName || "Selected Location"}</h4>
                              <p className="loc-full-text">{custLocation}</p>
                              {custCoords && (
                                <span className="loc-coords-tag">
                                  Coords: {custCoords.lat.toFixed(5)}, {custCoords.lng.toFixed(5)}
                                </span>
                              )}
                            </div>
                            <button type="button" className="gps-change-btn" onClick={handleClearLocation}>
                              Change
                            </button>
                          </div>

                          {!locationConfirmed ? (
                            <button
                              type="button"
                              className="loc-confirm-btn"
                              onClick={handleConfirmLocation}
                            >
                              <FaCheckCircle /> Confirm Delivery Location
                            </button>
                          ) : (
                            <div className="loc-confirmed-banner">
                              <FaCheckCircle /> Delivery Location Confirmed
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="loc-pending-prompt">
                          Please search address, use current location, or tap a point on the map.
                        </div>
                      )}
                    </div>

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
                  {/* ── Razorpay (Card / UPI / Netbanking / Wallet) ── */}
                  <button
                    className="upi-option-btn razorpay-btn"
                    onClick={handlePayWithRazorpay}
                    disabled={razorpayLoading}
                  >
                    {razorpayLoading ? <FaSpinner className="spin-icon" /> : <FaCreditCard />}
                    <div>
                      <span className="upi-opt-title">
                        {razorpayLoading ? "Opening payment…" : "Pay with Razorpay"}
                      </span>
                      <span className="upi-opt-desc">Card · UPI · Netbanking · Wallets</span>
                    </div>
                  </button>

                  {razorpayError && (
                    <div className="razorpay-error-msg">
                      ⚠️ {razorpayError}
                    </div>
                  )}

                  <div className="upi-divider-row">
                    <span className="upi-divider-line"></span>
                    <span className="upi-divider-text">OR</span>
                    <span className="upi-divider-line"></span>
                  </div>

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
