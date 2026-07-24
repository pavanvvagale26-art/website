import React, { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { OrderContext } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  FaSignOutAlt, FaCheck, FaTimes, FaMapMarkerAlt,
  FaMotorcycle, FaCheckCircle, FaBox, FaTruck,
  FaExternalLinkAlt, FaDirections, FaPhone,
  FaSatelliteDish, FaMoneyBillWave, FaQrcode, FaMobileAlt
} from "react-icons/fa";
import "../App.css";

// ——— UPI CONFIG (same as customer checkout) ———
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

// Opens Google Maps with directions from current position to customer location
const openGoogleMapsRoute = (order) => {
  let destination;
  if (order.coords && order.coords.lat && order.coords.lng) {
    destination = `${order.coords.lat},${order.coords.lng}`;
  } else if (order.location && order.location !== "Not provided") {
    destination = encodeURIComponent(order.location);
  } else {
    alert("No delivery location available for this order.");
    return;
  }
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  window.open(mapsUrl, "_blank");
};

export default function DeliveryPanel() {
  const { user, logout, updateDeliveryLocation } = useContext(AuthContext);
  const { todayOrders, acceptDelivery, rejectDelivery, markDelivered, markCodCollected } = useContext(OrderContext);
  const navigate = useNavigate();
  const watchIdRef = useRef(null);
  const [locationActive, setLocationActive] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  // Track which COD order's QR is currently expanded
  const [showQrFor, setShowQrFor] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "delivery") {
      navigate("/");
    }
  }, [user, navigate]);

  // Start continuous location sharing when panel mounts
  useEffect(() => {
    if (!user || user.role !== "delivery") return;

    if (navigator.geolocation) {
      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          updateDeliveryLocation(lat, lng);
          setLastLocation({ lat, lng });
          setLocationActive(true);
        },
        (err) => {
          console.error("Location tracking error:", err);
          setLocationActive(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        }
      );

      // Also update every 10 seconds as a fallback
      const intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            updateDeliveryLocation(lat, lng);
            setLastLocation({ lat, lng });
            setLocationActive(true);
          },
          () => { },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }, 10000);

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        clearInterval(intervalId);
      };
    }
  }, [user, updateDeliveryLocation]);

  if (!user || user.role !== "delivery") return null;

  const handleLogout = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    logout();
    navigate("/");
  };

  // Orders marked out for delivery (available to pick up)
  const availableOrders = todayOrders.filter(
    (o) => o.status === "out_for_delivery" && !o.deliveryPartner
  );

  // Orders assigned to this delivery partner
  const myOrders = todayOrders.filter(
    (o) => o.deliveryPartner === user.name
  );

  const activeDeliveries = myOrders.filter((o) => o.status === "out_for_delivery");
  const completedDeliveries = myOrders.filter((o) => o.status === "delivered");

  return (
    <div className="delivery-panel">
      {/* Top Header */}
      <header className="delivery-header">
        <div className="delivery-header-left">
          <FaMotorcycle className="delivery-header-icon" />
          <div>
            <h2>Delivery Dashboard</h2>
            <p>Welcome, {user.name}</p>
          </div>
        </div>
        <div className="delivery-header-right">
          {/* Location Sharing Indicator */}
          <div className={`location-badge ${locationActive ? "location-active" : "location-inactive"}`}>
            <FaSatelliteDish className={locationActive ? "pulse-icon" : ""} />
            <span>{locationActive ? "Live" : "Offline"}</span>
          </div>
          <button className="delivery-logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </header>

      {/* Partner Info Strip */}
      <div className="delivery-partner-info-strip">
        <div className="dp-info-item">
          <FaMotorcycle />
          <span>{user.name}</span>
        </div>
        <div className="dp-info-item">
          <FaPhone />
          <span>{user.phone || "N/A"}</span>
        </div>
        <div className="dp-info-item">
          <FaMapMarkerAlt />
          <span>
            {lastLocation
              ? `${lastLocation.lat.toFixed(4)}, ${lastLocation.lng.toFixed(4)}`
              : "Locating..."}
          </span>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="delivery-stats-strip">
        <div className="d-stat">
          <FaBox />
          <div>
            <span className="d-stat-value">{availableOrders.length}</span>
            <span className="d-stat-label">Available</span>
          </div>
        </div>
        <div className="d-stat">
          <FaTruck />
          <div>
            <span className="d-stat-value">{activeDeliveries.length}</span>
            <span className="d-stat-label">In Progress</span>
          </div>
        </div>
        <div className="d-stat">
          <FaCheckCircle />
          <div>
            <span className="d-stat-value">{completedDeliveries.length}</span>
            <span className="d-stat-label">Delivered</span>
          </div>
        </div>
      </div>

      <div className="delivery-content">
        {/* Available Orders */}
        <section className="delivery-section">
          <h3 className="delivery-section-title">
            <FaBox /> Available Orders
            {availableOrders.length > 0 && (
              <span className="section-count">{availableOrders.length}</span>
            )}
          </h3>

          {availableOrders.length === 0 ? (
            <div className="delivery-empty">
              <FaCheckCircle />
              <p>No orders available for pickup right now.</p>
              <small>New orders will appear here automatically.</small>
            </div>
          ) : (
            <div className="delivery-orders-grid">
              {availableOrders.map((order) => {
                const hasMultiItems = order.items && order.items.length > 1;
                const orderItems = order.items && order.items.length > 0 ? order.items : [{ name: order.item, price: order.price, qty: order.qty, total: order.total, img: order.img }];
                return (
                <div key={order.id} className={`delivery-order-card ${hasMultiItems ? 'order-multi-item' : ''}`}>
                  <div className="d-order-top">
                    {!hasMultiItems && (
                      <img src={orderItems[0].img} alt={orderItems[0].name} className="d-order-img" />
                    )}
                    <div className="d-order-info">
                      <span className="d-order-id">{order.id}</span>
                      <h4>{hasMultiItems ? `${orderItems.length} Items` : orderItems[0].name}</h4>
                      <p>Total Qty: {order.qty} &bull; ₹{order.total}</p>
                    </div>
                  </div>
                  {hasMultiItems && (
                    <div className="order-items-list">
                      {orderItems.map((it, idx) => (
                        <div key={idx} className="order-item-row">
                          <img src={it.img} alt={it.name} className="order-item-thumb" />
                          <div className="order-item-info">
                            <span className="order-item-name">{it.name}</span>
                            <span className="order-item-meta">Qty: {it.qty} &bull; ₹{it.total}</span>
                          </div>
                        </div>
                      ))}
                      <div className="order-items-total">
                        <span>Combined Total</span>
                        <span>₹{order.total}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className="d-order-location d-order-location-clickable"
                    onClick={() => openGoogleMapsRoute(order)}
                    title="Open route in Google Maps"
                  >
                    <FaMapMarkerAlt />
                    <span>{order.location}</span>
                    <FaExternalLinkAlt className="d-location-link-icon" />
                  </div>
                  <div className="d-order-customer">
                    <span>Customer: <strong>{order.customer}</strong></span>
                  </div>
                  <div className="d-order-actions">
                    <button
                      className="d-accept-btn"
                      onClick={() => acceptDelivery(order.id, user.name)}
                    >
                      <FaCheck /> Accept
                    </button>
                    <button
                      className="d-reject-btn"
                      onClick={() => rejectDelivery(order.id)}
                    >
                      <FaTimes /> Reject
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>

        {/* My Active Deliveries */}
        <section className="delivery-section">
          <h3 className="delivery-section-title">
            <FaTruck /> My Active Deliveries
            {activeDeliveries.length > 0 && (
              <span className="section-count active-count">{activeDeliveries.length}</span>
            )}
          </h3>

          {activeDeliveries.length === 0 ? (
            <div className="delivery-empty">
              <FaMotorcycle />
              <p>No active deliveries.</p>
            </div>
          ) : (
            <div className="delivery-orders-grid">
              {activeDeliveries.map((order) => {
                const hasMultiItems = order.items && order.items.length > 1;
                const orderItems = order.items && order.items.length > 0 ? order.items : [{ name: order.item, price: order.price, qty: order.qty, total: order.total, img: order.img }];
                return (
                <div key={order.id} className={`delivery-order-card active-delivery-card ${hasMultiItems ? 'order-multi-item' : ''}`}>
                  <div className="d-order-top">
                    {!hasMultiItems && (
                      <img src={orderItems[0].img} alt={orderItems[0].name} className="d-order-img" />
                    )}
                    <div className="d-order-info">
                      <span className="d-order-id">{order.id}</span>
                      <h4>{hasMultiItems ? `${orderItems.length} Items` : orderItems[0].name}</h4>
                      <p>Total Qty: {order.qty} &bull; ₹{order.total}</p>
                    </div>
                  </div>
                  {hasMultiItems && (
                    <div className="order-items-list">
                      {orderItems.map((it, idx) => (
                        <div key={idx} className="order-item-row">
                          <img src={it.img} alt={it.name} className="order-item-thumb" />
                          <div className="order-item-info">
                            <span className="order-item-name">{it.name}</span>
                            <span className="order-item-meta">Qty: {it.qty} &bull; ₹{it.total}</span>
                          </div>
                        </div>
                      ))}
                      <div className="order-items-total">
                        <span>Combined Total</span>
                        <span>₹{order.total}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className="d-order-location d-order-location-clickable"
                    onClick={() => openGoogleMapsRoute(order)}
                    title="Open route in Google Maps"
                  >
                    <FaMapMarkerAlt />
                    <span>{order.location}</span>
                    <FaExternalLinkAlt className="d-location-link-icon" />
                  </div>
                  <div className="d-order-customer">
                    <span>Customer: <strong>{order.customer}</strong></span>
                  </div>
                  {/* Navigate to Customer button */}
                  <button
                    className="d-navigate-btn"
                    onClick={() => openGoogleMapsRoute(order)}
                  >
                    <FaDirections /> Navigate to Customer
                  </button>

                  {/* ── COD PAYMENT COLLECTION CARD ── */}
                  {order.paymentMethod === "cod" && (
                    <div className={`cod-collect-card ${order.codPaymentReceived ? "cod-collect-card--done" : ""
                      }`}>
                      <div className="cod-collect-header">
                        <FaMoneyBillWave className="cod-collect-icon" />
                        <div>
                          <span className="cod-collect-title">
                            {order.codPaymentReceived
                              ? order.codCollectionMethod === "upi_scan"
                                ? "✅ UPI Payment Received"
                                : "✅ Cash Received"
                              : "Collect Payment"}
                          </span>
                          <span className="cod-collect-amount">₹{order.total?.toFixed(2)}</span>
                        </div>
                      </div>

                      {!order.codPaymentReceived && (
                        <>
                          {/* QR Toggle */}
                          <button
                            className="cod-show-qr-btn"
                            onClick={() =>
                              setShowQrFor(showQrFor === order.id ? null : order.id)
                            }
                          >
                            <FaQrcode />
                            {showQrFor === order.id ? "Hide QR" : "Show UPI QR for Customer"}
                          </button>

                          {/* UPI QR Code */}
                          {showQrFor === order.id && (
                            <div className="cod-qr-section">
                              <p className="cod-qr-hint">Customer scans this to pay ₹{order.total?.toFixed(2)}</p>
                              <div className="cod-qr-wrapper">
                                <QRCodeSVG
                                  value={buildUpiUrl(order.total || 0, order.id)}
                                  size={180}
                                  level="H"
                                  includeMargin={true}
                                  bgColor="#ffffff"
                                  fgColor="#1e293b"
                                />
                              </div>
                              <p className="cod-upi-id">UPI ID: <strong>{UPI_ID}</strong></p>
                              <button
                                className="cod-upi-collected-btn"
                                onClick={() => {
                                  markCodCollected(order.id, "upi_scan");
                                  setShowQrFor(null);
                                }}
                              >
                                <FaMobileAlt /> Customer Scanned & Paid
                              </button>
                            </div>
                          )}

                          {/* Cash Button */}
                          <button
                            className="cod-cash-btn"
                            onClick={() => markCodCollected(order.id, "cash")}
                          >
                            <FaMoneyBillWave /> Cash Received from Customer
                          </button>
                        </>
                      )}

                      {order.codPaymentReceived && (
                        <div className="cod-payment-confirmed-msg">
                          <FaCheckCircle />
                          <span>
                            {order.codCollectionMethod === "upi_scan"
                              ? "UPI payment scanned at doorstep"
                              : "Cash collected from customer"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="d-order-actions">
                    <button
                      className={`d-delivered-btn ${order.paymentMethod === "cod" && !order.codPaymentReceived
                          ? "d-delivered-btn--disabled"
                          : ""
                        }`}
                      onClick={() => {
                        if (order.paymentMethod === "cod" && !order.codPaymentReceived) {
                          return; // block if COD not yet collected
                        }
                        markDelivered(order.id);
                      }}
                      title={
                        order.paymentMethod === "cod" && !order.codPaymentReceived
                          ? "Collect payment first before marking delivered"
                          : "Mark as Delivered"
                      }
                    >
                      <FaCheckCircle /> Mark as Delivered
                      {order.paymentMethod === "cod" && !order.codPaymentReceived && (
                        <span className="d-delivered-lock-hint"> (Collect payment first)</span>
                      )}
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Completed Deliveries */}
        {completedDeliveries.length > 0 && (
          <section className="delivery-section">
            <h3 className="delivery-section-title">
              <FaCheckCircle /> Completed Today
              <span className="section-count completed-count">{completedDeliveries.length}</span>
            </h3>
            <div className="delivery-orders-grid">
              {completedDeliveries.map((order) => {
                const hasMultiItems = order.items && order.items.length > 1;
                const orderItems = order.items && order.items.length > 0 ? order.items : [{ name: order.item, price: order.price, qty: order.qty, total: order.total, img: order.img }];
                return (
                <div key={order.id} className={`delivery-order-card completed-card ${hasMultiItems ? 'order-multi-item' : ''}`}>
                  <div className="d-order-top">
                    {!hasMultiItems && (
                      <img src={orderItems[0].img} alt={orderItems[0].name} className="d-order-img" />
                    )}
                    <div className="d-order-info">
                      <span className="d-order-id">{order.id}</span>
                      <h4>{hasMultiItems ? `${orderItems.length} Items` : orderItems[0].name}</h4>
                      <p>Total Qty: {order.qty} &bull; ₹{order.total}</p>
                    </div>
                  </div>
                  {hasMultiItems && (
                    <div className="order-items-list">
                      {orderItems.map((it, idx) => (
                        <div key={idx} className="order-item-row">
                          <img src={it.img} alt={it.name} className="order-item-thumb" />
                          <div className="order-item-info">
                            <span className="order-item-name">{it.name}</span>
                            <span className="order-item-meta">Qty: {it.qty} &bull; ₹{it.total}</span>
                          </div>
                        </div>
                      ))}
                      <div className="order-items-total">
                        <span>Combined Total</span>
                        <span>₹{order.total}</span>
                      </div>
                    </div>
                  )}
                  <div
                    className="d-order-location d-order-location-clickable"
                    onClick={() => openGoogleMapsRoute(order)}
                    title="Open route in Google Maps"
                  >
                    <FaMapMarkerAlt />
                    <span>{order.location}</span>
                    <FaExternalLinkAlt className="d-location-link-icon" />
                  </div>
                  <div className="completed-badge">
                    <FaCheckCircle /> Delivered
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
