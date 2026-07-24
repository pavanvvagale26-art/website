import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { MenuContext } from "../context/MenuContext";
import { OrderContext } from "../context/OrderContext";
import { useNavigate } from "react-router-dom";
import {
  FaBoxOpen, FaClipboardList, FaChartBar, FaSignOutAlt,
  FaPlus, FaTrash, FaCheck, FaFire, FaTruck, FaImage,
  FaRupeeSign, FaShoppingBag, FaMotorcycle, FaArrowUp, FaEdit, FaTimes, FaSave,
  FaPhone, FaEnvelope, FaMoneyBillWave, FaUser, FaMapMarkerAlt,
  FaClock, FaUtensils, FaChartLine, FaReceipt
} from "react-icons/fa";
import "../App.css";

export default function AdminPanel() {
  const { user, logout } = useContext(AuthContext);
  const { menu, addProduct, removeProduct, editProduct } = useContext(MenuContext);
  const { todayOrders, analytics, updateOrderStatus } = useContext(OrderContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("dashboard");

  // Item form state
  const [category, setCategory] = useState("brunch");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Edit item state
  const [editingItem, setEditingItem] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Animated counters
  const [animatedRevenue, setAnimatedRevenue] = useState(0);
  const [animatedOrders, setAnimatedOrders] = useState(0);

  // Time state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Animate counters
  useEffect(() => {
    if (activeTab === "dashboard") {
      const targetRevenue = analytics.revenue;
      const targetOrders = analytics.totalOrders;
      const duration = 1000;
      const steps = 30;
      const stepTime = duration / steps;

      let currentStep = 0;
      const timer = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimatedRevenue(Math.floor(targetRevenue * eased));
        setAnimatedOrders(Math.floor(targetOrders * eased));
        if (currentStep >= steps) {
          clearInterval(timer);
          setAnimatedRevenue(targetRevenue);
          setAnimatedOrders(targetOrders);
        }
      }, stepTime);
      return () => clearInterval(timer);
    }
  }, [activeTab, analytics.revenue, analytics.totalOrders]);

  if (!user || user.role !== "admin") return null;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Max 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!name || !price || !imagePreview) {
      alert("Please fill name, price, and upload an image.");
      return;
    }
    addProduct(category, { name, price: parseInt(price), desc, img: imagePreview });
    setName(""); setPrice(""); setDesc(""); setImagePreview(null);
    e.target.reset();
    setAddSuccess(true);
    setTimeout(() => setAddSuccess(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleEditItem = (cat, item) => {
    setEditingItem(item);
    setEditCategory(cat);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditDesc(item.desc || "");
    setEditImagePreview(item.img);
  };

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Max 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editName || !editPrice) {
      alert("Name and price are required.");
      return;
    }
    editProduct(editCategory, editingItem.id, {
      name: editName,
      price: parseInt(editPrice),
      desc: editDesc,
      img: editImagePreview,
    });
    setEditSuccess(true);
    setTimeout(() => {
      setEditSuccess(false);
      setEditingItem(null);
    }, 1200);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
  };

  const statusConfig = {
    pending: { label: "Pending", color: "#f59e0b", bg: "#fef3c7", icon: <FaClock /> },
    accepted: { label: "Accepted", color: "#3b82f6", bg: "#dbeafe", icon: <FaCheck /> },
    preparing: { label: "Preparing", color: "#8b5cf6", bg: "#ede9fe", icon: <FaFire /> },
    out_for_delivery: { label: "Out for Delivery", color: "#f97316", bg: "#ffedd5", icon: <FaMotorcycle /> },
    delivered: { label: "Delivered", color: "#10b981", bg: "#d1fae5", icon: <FaCheck /> },
  };

  const getNextActions = (status) => {
    switch (status) {
      case "pending":
        return [{ action: "accepted", label: "Accept Order", icon: <FaCheck /> }];
      case "accepted":
        return [{ action: "preparing", label: "Start Preparing", icon: <FaFire /> }];
      case "preparing":
        return [{ action: "out_for_delivery", label: "Out for Delivery", icon: <FaTruck /> }];
      default:
        return [];
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const totalMenuItems = (menu.brunch?.length || 0) + (menu.evening?.length || 0) + (menu.beverages?.length || 0);

  return (
    <div className="admin-panel">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <img src="/logo.png" alt="Logo" className="sidebar-logo" />
            <div className="sidebar-brand-text">
              <h3>Admin Panel</h3>
              <span className="sidebar-role">Restaurant Manager</span>
            </div>
          </div>
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {user.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-status">● Online</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-nav-label">MAIN MENU</span>
          <button
            className={`sidebar-btn ${activeTab === "dashboard" ? "sidebar-active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <span className="sidebar-btn-icon"><FaChartBar /></span>
            <span>Dashboard</span>
          </button>
          <button
            className={`sidebar-btn ${activeTab === "items" ? "sidebar-active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            <span className="sidebar-btn-icon"><FaBoxOpen /></span>
            <span>Items Management</span>
          </button>
          <button
            className={`sidebar-btn ${activeTab === "orders" ? "sidebar-active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <span className="sidebar-btn-icon"><FaClipboardList /></span>
            <span>Orders</span>
            {analytics.pending > 0 && (
              <span className="sidebar-badge pulse-badge">{analytics.pending}</span>
            )}
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-clock">
            <FaClock />
            <span>{currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <FaSignOutAlt /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {/* Mobile Top Bar */}
        <div className="admin-mobile-topbar">
          <img src="/logo.png" alt="Logo" className="mobile-topbar-logo" />
          <h3>Admin</h3>
          <button className="mobile-logout" onClick={handleLogout}><FaSignOutAlt /></button>
        </div>

        {/* Mobile Tab Bar */}
        <div className="admin-mobile-tabs">
          <button className={activeTab === "dashboard" ? "mtab-active" : ""} onClick={() => setActiveTab("dashboard")}>
            <FaChartBar /><span>Dashboard</span>
          </button>
          <button className={activeTab === "items" ? "mtab-active" : ""} onClick={() => setActiveTab("items")}>
            <FaBoxOpen /><span>Items</span>
          </button>
          <button className={activeTab === "orders" ? "mtab-active" : ""} onClick={() => setActiveTab("orders")}>
            <FaClipboardList /><span>Orders</span>
            {analytics.pending > 0 && <span className="mtab-badge">{analytics.pending}</span>}
          </button>
        </div>

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === "dashboard" && (
          <div className="admin-content fade-in">
            <div className="admin-content-header">
              <div className="admin-welcome">
                <h1>{getGreeting()}, <span className="highlight-name">{user.name}</span> 👋</h1>
                <p>Here's what's happening with your restaurant today</p>
              </div>
              <div className="admin-date-badge">
                <FaClock />
                <span>{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card stat-orders">
                <div className="stat-card-glow"></div>
                <div className="stat-icon-wrap">
                  <FaShoppingBag />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Orders</span>
                  <span className="stat-value">{animatedOrders}</span>
                </div>
                <div className="stat-trend trend-up"><FaArrowUp /> 12%</div>
              </div>

              <div className="stat-card stat-revenue">
                <div className="stat-card-glow"></div>
                <div className="stat-icon-wrap">
                  <FaRupeeSign />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Revenue</span>
                  <span className="stat-value">₹{animatedRevenue.toLocaleString("en-IN")}</span>
                </div>
                <div className="stat-trend trend-up"><FaArrowUp /> 8%</div>
              </div>

              <div className="stat-card stat-delivery">
                <div className="stat-card-glow"></div>
                <div className="stat-icon-wrap">
                  <FaMotorcycle />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Active Deliveries</span>
                  <span className="stat-value">{analytics.activeDeliveries}</span>
                </div>
              </div>

              <div className="stat-card stat-delivered">
                <div className="stat-card-glow"></div>
                <div className="stat-icon-wrap">
                  <FaCheck />
                </div>
                <div className="stat-info">
                  <span className="stat-label">Delivered</span>
                  <span className="stat-value">{analytics.delivered}</span>
                </div>
              </div>
            </div>

            {/* Quick Glance Row */}
            <div className="quick-glance-row">
              <div className="quick-glance-card">
                <div className="qg-icon qg-pending"><FaClock /></div>
                <div className="qg-info">
                  <span className="qg-value">{analytics.pending}</span>
                  <span className="qg-label">Pending</span>
                </div>
              </div>
              <div className="quick-glance-card">
                <div className="qg-icon qg-preparing"><FaFire /></div>
                <div className="qg-info">
                  <span className="qg-value">{analytics.preparing}</span>
                  <span className="qg-label">Preparing</span>
                </div>
              </div>
              <div className="quick-glance-card">
                <div className="qg-icon qg-menu"><FaUtensils /></div>
                <div className="qg-info">
                  <span className="qg-value">{totalMenuItems}</span>
                  <span className="qg-label">Menu Items</span>
                </div>
              </div>
              <div className="quick-glance-card">
                <div className="qg-icon qg-avg"><FaChartLine /></div>
                <div className="qg-info">
                  <span className="qg-value">₹{analytics.totalOrders > 0 ? Math.round(analytics.revenue / analytics.totalOrders) : 0}</span>
                  <span className="qg-label">Avg. Order</span>
                </div>
              </div>
            </div>

            {/* Dashboard Grid - Breakdown + Recent */}
            <div className="dashboard-grid-two">
              {/* Order status breakdown */}
              <div className="dashboard-breakdown">
                <div className="dash-card-header">
                  <h2><FaChartBar /> Order Status Breakdown</h2>
                </div>
                <div className="breakdown-bars">
                  {Object.entries({
                    Pending: { count: analytics.pending, color: "#f59e0b", gradient: "linear-gradient(135deg, #f59e0b, #fbbf24)" },
                    Preparing: { count: analytics.preparing, color: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)" },
                    "Out for Delivery": { count: analytics.activeDeliveries, color: "#f97316", gradient: "linear-gradient(135deg, #f97316, #fb923c)" },
                    Delivered: { count: analytics.delivered, color: "#10b981", gradient: "linear-gradient(135deg, #10b981, #34d399)" },
                  }).map(([label, { count, gradient }]) => (
                    <div key={label} className="breakdown-bar-row">
                      <span className="breakdown-label">{label}</span>
                      <div className="breakdown-track">
                        <div
                          className="breakdown-fill"
                          style={{
                            width: `${analytics.totalOrders ? (count / analytics.totalOrders) * 100 : 0}%`,
                            background: gradient,
                          }}
                        ></div>
                      </div>
                      <span className="breakdown-count">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent orders */}
              <div className="dashboard-recent">
                <div className="dash-card-header">
                  <h2><FaReceipt /> Recent Orders</h2>
                  <span className="dash-card-count">{todayOrders.length} today</span>
                </div>
                <div className="recent-table-wrap">
                  <table className="recent-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Item</th>
                        <th>Customer</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Payment</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayOrders.slice(0, 6).map((o) => {
                        const displayItem = o.items && o.items.length > 1
                          ? `${o.items[0].name} + ${o.items.length - 1} more`
                          : o.items && o.items.length === 1
                            ? o.items[0].name
                            : o.item;
                        return (
                        <tr key={o.id}>
                          <td className="order-id-cell">{o.id}</td>
                          <td>{displayItem}</td>
                          <td>{o.customer}</td>
                          <td>{o.qty}</td>
                          <td className="order-total-cell">₹{o.total}</td>
                          <td>
                            <span className={`payment-badge ${o.paymentMethod === 'cod'
                                ? o.codPaymentReceived
                                  ? o.codCollectionMethod === 'upi_scan'
                                    ? 'payment-cod-upi'
                                    : 'payment-cod-done'
                                  : 'payment-cod'
                                : 'payment-upi'
                              }`}>
                              {o.paymentMethod === 'cod'
                                ? o.codPaymentReceived
                                  ? o.codCollectionMethod === 'upi_scan'
                                    ? '📱 COD · UPI Paid'
                                    : '✅ COD · Cash Paid'
                                  : '💵 COD · Pending'
                                : '📱 UPI'}
                            </span>
                          </td>
                          <td>
                            <span
                              className="status-pill"
                              style={{ background: statusConfig[o.status]?.bg, color: statusConfig[o.status]?.color }}
                            >
                              {statusConfig[o.status]?.label}
                            </span>
                          </td>
                        </tr>
                        );
                      })}
                      {todayOrders.length === 0 && (
                        <tr>
                          <td colSpan="7" className="empty-table-msg">No orders yet today</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== ITEMS TAB ===== */}
        {activeTab === "items" && (
          <div className="admin-content fade-in">
            <div className="admin-content-header">
              <h1><FaUtensils className="header-icon" /> Items Management</h1>
              <p>Add, edit, and manage your restaurant menu</p>
            </div>

            {/* Add Item Form */}
            <div className="item-form-card">
              <h2><FaPlus /> Add New Item</h2>
              <form onSubmit={handleAddProduct} className="item-form">
                <div className="item-form-grid">
                  <div className="form-group">
                    <label>Category</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="brunch">🍳 Brunch (10 AM - 3 PM)</option>
                      <option value="evening">🌙 Evening (6 PM - 10 PM)</option>
                      <option value="beverages">🥤 Beverages</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Item Name</label>
                    <input
                      type="text"
                      placeholder="E.g., Special Mutton Biryani"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input
                      type="number"
                      placeholder="E.g., 250"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label>Description</label>
                    <textarea
                      placeholder="Short description of the dish..."
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      rows="2"
                    />
                  </div>

                  <div className="form-group form-group-full">
                    <label><FaImage /> Upload Image</label>
                    <div className="image-upload-zone">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        id="item-image-upload"
                      />
                      <label htmlFor="item-image-upload" className="upload-label">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Preview" className="upload-preview" />
                        ) : (
                          <div className="upload-placeholder">
                            <FaImage />
                            <span>Click to upload image</span>
                            <small>JPG, PNG up to 5MB</small>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <button type="submit" className="item-submit-btn">
                  <FaPlus /> Add to Menu
                </button>

                {addSuccess && (
                  <div className="add-success-msg">
                    <FaCheck /> Item added successfully!
                  </div>
                )}
              </form>
            </div>

            {/* Existing Items */}
            <div className="items-list-section">
              <h2>Current Menu Items</h2>
              {["brunch", "evening", "beverages"].map((cat) => (
                <div key={cat} className="items-category">
                  <h3 className="category-title">
                    {cat === "brunch" ? "🍳 Brunch" : cat === "evening" ? "🌙 Evening" : "🥤 Beverages"}
                    <span className="cat-count">{menu[cat]?.length || 0} items</span>
                  </h3>
                  {menu[cat]?.length === 0 && (
                    <p className="empty-category">No items in this category.</p>
                  )}
                  <div className="items-grid-admin">
                    {menu[cat]?.map((item) => (
                      <div key={item.id} className="item-card-admin">
                        <img src={item.img} alt={item.name} className="item-card-img" />
                        <div className="item-card-info">
                          <strong>{item.name}</strong>
                          <span className="item-card-price">₹{item.price}.00</span>
                        </div>
                        <div className="item-card-actions">
                          <button
                            className="item-edit-btn"
                            onClick={() => handleEditItem(cat, item)}
                            title="Edit item"
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="item-delete-btn"
                            onClick={() => {
                              if (window.confirm(`Delete ${item.name}?`)) removeProduct(cat, item.id);
                            }}
                            title="Delete item"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Edit Item Modal */}
            {editingItem && (
              <div className="edit-modal-overlay" onClick={handleCancelEdit}>
                <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="edit-modal-header">
                    <h2><FaEdit /> Edit Item</h2>
                    <button className="edit-modal-close" onClick={handleCancelEdit}><FaTimes /></button>
                  </div>
                  <form onSubmit={handleSaveEdit} className="edit-form">
                    <div className="edit-form-grid">
                      <div className="form-group">
                        <label>Item Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Item name"
                        />
                      </div>
                      <div className="form-group">
                        <label>Price (₹)</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="Price"
                        />
                      </div>
                      <div className="form-group form-group-full">
                        <label>Description</label>
                        <textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Item description..."
                          rows="3"
                        />
                      </div>
                      <div className="form-group form-group-full">
                        <label><FaImage /> Change Image</label>
                        <div className="image-upload-zone">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditImageUpload}
                            id="edit-image-upload"
                          />
                          <label htmlFor="edit-image-upload" className="upload-label">
                            {editImagePreview ? (
                              <img src={editImagePreview} alt="Preview" className="upload-preview" />
                            ) : (
                              <div className="upload-placeholder">
                                <FaImage />
                                <span>Click to upload image</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="edit-modal-actions">
                      <button type="button" className="edit-cancel-btn" onClick={handleCancelEdit}>
                        <FaTimes /> Cancel
                      </button>
                      <button type="submit" className="edit-save-btn">
                        <FaSave /> Save Changes
                      </button>
                    </div>
                    {editSuccess && (
                      <div className="add-success-msg">
                        <FaCheck /> Item updated successfully!
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ORDERS TAB ===== */}
        {activeTab === "orders" && (
          <div className="admin-content fade-in">
            <div className="admin-content-header">
              <h1><FaClipboardList className="header-icon" /> Orders Management</h1>
              <p>{todayOrders.length} orders today</p>
            </div>

            <div className="orders-list">
              {todayOrders.length === 0 && (
                <div className="empty-orders">
                  <FaClipboardList className="empty-orders-icon" />
                  <p>No orders yet today.</p>
                  <small>Orders will appear here once customers place them</small>
                </div>
              )}
              {todayOrders.map((order) => {
                const hasMultiItems = order.items && order.items.length > 1;
                const orderItems = order.items && order.items.length > 0 ? order.items : [{ name: order.item, price: order.price, qty: order.qty, total: order.total, img: order.img }];
                return (
                <div key={order.id} className={`order-card-admin ${order.status === 'pending' ? 'order-pending-glow' : ''} ${hasMultiItems ? 'order-multi-item' : ''}`}>
                  <div className="order-card-top">
                    <div className="order-card-left">
                      {!hasMultiItems && (
                        <img src={orderItems[0].img} alt={orderItems[0].name} className="order-thumb" />
                      )}
                      <div className="order-details">
                        <h4>{hasMultiItems ? `${orderItems.length} Items` : orderItems[0].name}</h4>
                        <p className="order-meta">
                          <span>Total Qty: {order.qty}</span> &bull;
                          <span> ₹{order.total}</span>
                        </p>
                      </div>
                    </div>
                    <div className="order-card-right">
                      <span className="order-id-label">{order.id}</span>
                      <span
                        className="status-pill"
                        style={{
                          background: statusConfig[order.status]?.bg,
                          color: statusConfig[order.status]?.color,
                        }}
                      >
                        {statusConfig[order.status]?.label}
                      </span>
                      <span className={`payment-badge ${order.paymentMethod === 'cod'
                          ? order.codPaymentReceived
                            ? order.codCollectionMethod === 'upi_scan'
                              ? 'payment-cod-upi'
                              : 'payment-cod-done'
                            : 'payment-cod'
                          : 'payment-upi'
                        }`}>
                        {order.paymentMethod === 'cod'
                          ? order.codPaymentReceived
                            ? order.codCollectionMethod === 'upi_scan'
                              ? '📱 COD · UPI Paid'
                              : '✅ COD · Cash Paid'
                            : '💵 COD · Pending'
                          : '📱 UPI'}
                      </span>
                    </div>
                  </div>

                  {/* Multi-item list */}
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

                  {/* Customer Details Section */}
                  <div className="order-customer-details">
                    <div className="ocd-row">
                      <FaUser className="ocd-icon" />
                      <span className="ocd-label">Customer:</span>
                      <span className="ocd-value">{order.customer || 'Guest User'}</span>
                    </div>
                    <div className="ocd-row">
                      <FaPhone className="ocd-icon" />
                      <span className="ocd-label">Phone:</span>
                      <span className="ocd-value">
                        {order.phone ? (
                          <a href={`tel:${order.phone}`} className="ocd-link">{order.phone}</a>
                        ) : 'N/A'}
                      </span>
                    </div>
                    <div className="ocd-row">
                      <FaEnvelope className="ocd-icon" />
                      <span className="ocd-label">Email:</span>
                      <span className="ocd-value">
                        {order.email ? (
                          <a href={`mailto:${order.email}`} className="ocd-link">{order.email}</a>
                        ) : 'N/A'}
                      </span>
                    </div>
                    <div className="ocd-row">
                      <FaMapMarkerAlt className="ocd-icon" />
                      <span className="ocd-label">Location:</span>
                      <span className="ocd-value">{order.location || 'Not provided'}</span>
                    </div>
                    {order.deliveryPartner && (
                      <div className="ocd-row">
                        <FaTruck className="ocd-icon" />
                        <span className="ocd-label">Delivery:</span>
                        <span className="ocd-value">{order.deliveryPartner}</span>
                      </div>
                    )}
                  </div>

                  {getNextActions(order.status).length > 0 && (
                    <div className="order-actions">
                      {getNextActions(order.status).map((a) => (
                        <button
                          key={a.action}
                          className="order-action-btn"
                          onClick={() => updateOrderStatus(order.id, a.action)}
                        >
                          {a.icon} {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
