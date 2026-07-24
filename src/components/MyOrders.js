import React, { useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { OrderContext } from "../context/OrderContext";
import {
  FaArrowLeft,
  FaPhone,
  FaMapMarkerAlt,
  FaShoppingBag,
  FaSearch,
  FaTruck,
  FaUser,
  FaMotorcycle,
} from "react-icons/fa";
import "../App.css";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out of Delivery" },
  { value: "delivered", label: "Delivered" },
];

const STATUS_COLORS = {
  pending: "#f59e0b",
  accepted: "#3b82f6",
  preparing: "#8b5cf6",
  out_for_delivery: "#ef4444",
  delivered: "#10b981",
};

export default function MyOrders() {
  const navigate = useNavigate();
  const { orders, getCustomerOrders } = useContext(OrderContext);
  const [phone, setPhone] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [customerOrders, setCustomerOrders] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-load if phone was previously saved
  useEffect(() => {
    const savedPhone = localStorage.getItem("sgs_customer_phone");
    if (savedPhone) {
      setPhone(savedPhone);
      setSearchedPhone(savedPhone);
      setHasSearched(true);
    }
  }, []);

  // Refresh orders when orders state changes (cross-tab sync)
  useEffect(() => {
    if (searchedPhone) {
      const filtered = getCustomerOrders(searchedPhone);
      setCustomerOrders(filtered);
    }
  }, [searchedPhone, orders, getCustomerOrders]);

  const handleSearch = () => {
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone.trim())) return;
    const trimmed = phone.trim();
    localStorage.setItem("sgs_customer_phone", trimmed);
    setSearchedPhone(trimmed);
    setHasSearched(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // Group orders by order batch (same createdAt timestamp within 2 seconds = same batch)
  const groupedOrders = useCallback(() => {
    const groups = [];
    const used = new Set();

    customerOrders.forEach((order) => {
      if (used.has(order.id)) return;
      const batch = [order];
      used.add(order.id);

      customerOrders.forEach((other) => {
        if (used.has(other.id)) return;
        const timeDiff = Math.abs(
          new Date(order.createdAt).getTime() - new Date(other.createdAt).getTime()
        );
        if (timeDiff < 3000) {
          batch.push(other);
          used.add(other.id);
        }
      });

      groups.push(batch);
    });

    return groups;
  }, [customerOrders]);

  const grouped = groupedOrders();

  // Get first customer info from a batch
  const getCustomerInfo = (batch) => {
    const first = batch[0];
    return {
      name: first.customer || "Guest User",
      email: first.email || "",
      phone: first.phone || "",
      location: first.location || "Not provided",
      coords: first.coords || null,
    };
  };

  // Overall status of a batch (worst status)
  const getBatchStatus = (batch) => {
    const statusPriority = ["pending", "accepted", "preparing", "out_for_delivery", "delivered"];
    let worstIdx = 999;
    batch.forEach((o) => {
      const idx = statusPriority.indexOf(o.status);
      if (idx < worstIdx) worstIdx = idx;
    });
    return statusPriority[worstIdx] || "pending";
  };

  // Get delivery partner info from batch
  const getDeliveryPartner = (batch) => {
    const withPartner = batch.find((o) => o.deliveryPartner);
    return withPartner ? withPartner.deliveryPartner : null;
  };

  // Get total for batch
  const getBatchTotal = (batch) => {
    return batch.reduce((sum, o) => sum + (o.total || 0), 0);
  };

  return (
    <div className="myorders-page fade-in">
      <div className="myorders-container">
        {/* Header */}
        <div className="myorders-header">
          <button className="myorders-back-btn" onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <h1>My Orders</h1>
        </div>

        {/* Phone Search */}
        {!hasSearched && (
          <div className="myorders-search-card">
            <div className="myorders-search-icon">
              <FaShoppingBag />
            </div>
            <h2>Track Your Orders</h2>
            <p>Enter the phone number used during checkout to view your orders</p>
            <div className="myorders-search-input-wrap">
              <FaPhone className="myorders-search-phone-icon" />
              <input
                type="tel"
                placeholder="Enter your 10-digit phone number"
                value={phone}
                maxLength={10}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                onKeyDown={handleKeyDown}
                className="myorders-search-input"
              />
              <button
                className="myorders-search-btn"
                onClick={handleSearch}
                disabled={!/^[6-9]\d{9}$/.test(phone.trim())}
              >
                <FaSearch /> Find Orders
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <>
            {/* Change phone strip */}
            <div className="myorders-phone-strip">
              <span>
                <FaPhone /> Orders for <strong>{searchedPhone}</strong>
              </span>
              <button
                onClick={() => {
                  setHasSearched(false);
                  setSearchedPhone("");
                  setPhone("");
                  localStorage.removeItem("sgs_customer_phone");
                }}
              >
                Change
              </button>
            </div>

            {customerOrders.length === 0 ? (
              <div className="myorders-empty">
                <FaShoppingBag />
                <h3>No Orders Found</h3>
                <p>No orders found for this phone number. Place your first order from the menu!</p>
                <button onClick={() => navigate("/menu")} className="myorders-goto-menu-btn">
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="myorders-list">
                {grouped.map((batch, idx) => {
                  const info = getCustomerInfo(batch);
                  const batchStatus = getBatchStatus(batch);
                  const deliveryPartner = getDeliveryPartner(batch);
                  const batchTotal = getBatchTotal(batch);

                  return (
                    <div key={idx} className="myorders-card">
                      {/* Customer Info */}
                      <div className="myorders-cust-info">
                        <h3 className="myorders-cust-name">{info.name}</h3>
                        {info.email && (
                          <p className="myorders-cust-email">{info.email}</p>
                        )}
                        <p className="myorders-cust-phone">
                          <FaPhone /> {info.phone}
                        </p>
                        <p className="myorders-cust-location">
                          <FaMapMarkerAlt /> {info.location}
                        </p>
                        {info.coords && (
                          <p className="myorders-cust-coords">
                            Lat: {info.coords.lat?.toFixed(6)}, Lng: {info.coords.lng?.toFixed(6)}
                          </p>
                        )}
                      </div>

                      {/* Items */}
                      <div className="myorders-items-section">
                        <h4 className="myorders-items-title">Items:</h4>
                        {batch.map((order) => {
                          const displayItems = order.items && order.items.length > 0
                            ? order.items
                            : [{ name: order.item, qty: order.qty, total: order.total }];
                          return displayItems.map((it, itIdx) => (
                            <div key={`${order.id}-${itIdx}`} className="myorders-item-row">
                              <span className="myorders-item-name">
                                {it.name} <span className="myorders-item-qty">× {it.qty}</span>
                              </span>
                              <span className="myorders-item-price">₹{it.total}</span>
                            </div>
                          ));
                        })}
                      </div>

                      {/* Status */}
                      <div className="myorders-status-row">
                        <span className="myorders-status-label">Status:</span>
                        <span
                          className="myorders-status-value"
                          style={{ color: STATUS_COLORS[batchStatus] }}
                        >
                          {STATUS_OPTIONS.find((s) => s.value === batchStatus)?.label || batchStatus}
                        </span>
                        {/* <select
                          className="myorders-status-select"
                          value={batchStatus}
                          disabled
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select> */}
                      </div>

                      {/* Delivery Partner Info */}
                      {deliveryPartner && (
                        <div className="myorders-delivery-info">
                          <h4 className="myorders-delivery-title">
                            <FaMotorcycle /> Delivery Partner:
                          </h4>
                          <ul className="myorders-delivery-list">
                            <li>
                              <FaUser /> {deliveryPartner}
                            </li>
                          </ul>
                        </div>
                      )}

                      {/* Total */}
                      <div className="myorders-total-row">
                        <span>Total:</span>
                        <span className="myorders-total-value">₹{batchTotal}</span>
                      </div>

                      {/* Track Order Button */}
                      {(batchStatus === "out_for_delivery" || batchStatus === "preparing" || batchStatus === "accepted") && (
                        <button
                          className="myorders-track-btn"
                          onClick={() =>
                            navigate("/track-order", {
                              state: {
                                batch,
                                customerInfo: info,
                                deliveryPartner,
                              },
                            })
                          }
                        >
                          <FaTruck /> Track Order
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
