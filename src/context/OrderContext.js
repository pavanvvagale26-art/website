import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from "react";

export const OrderContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Helper to get today's date string in local time (not UTC)
const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [serverOnline, setServerOnline] = useState(true);
  const pollRef = useRef(null);

  // ── Fetch all orders from server ────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/orders`, { cache: "no-store" });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      setOrders(data);
      setServerOnline(true);
    } catch {
      setServerOnline(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Poll every 5 seconds so admin sees new orders without refresh
  useEffect(() => {
    pollRef.current = setInterval(fetchOrders, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchOrders]);

  // ── Toast helpers ───────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ── Add a new order (customer checkout) ────────────────────────────────────
  const addOrder = useCallback(async (orderData) => {
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error("Failed to save order");
      const saved = await res.json();
      // Optimistically prepend to local state so customer sees it immediately
      setOrders((prev) => [saved, ...prev]);
      addToast("New order placed!", "info");
      return saved;
    } catch (err) {
      console.error("addOrder error:", err);
      // Fallback: store locally so the customer's session still works
      const fallback = {
        id: `ORD-${Date.now()}`,
        ...orderData,
        items: orderData.items || [],
        status: "pending",
        deliveryPartner: null,
        createdAt: new Date().toISOString(),
        date: getLocalToday(),
      };
      setOrders((prev) => [fallback, ...prev]);
      addToast("Order placed (offline mode)", "warning");
      return fallback;
    }
  }, [addToast]);

  // ── Update order status (admin action) ─────────────────────────────────────
  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error("updateOrderStatus error:", err);
    }
    const statusLabels = {
      accepted: "Order Accepted",
      preparing: "Order is being Prepared",
      out_for_delivery: "Order is Out for Delivery",
      delivered: "Order Delivered",
    };
    addToast(statusLabels[newStatus] || `Status: ${newStatus}`, "success");
  }, [addToast]);

  // ── Assign delivery partner ─────────────────────────────────────────────────
  const assignDeliveryPartner = useCallback(async (orderId, partnerName) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, deliveryPartner: partnerName, status: "out_for_delivery" }
          : o
      )
    );
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryPartner: partnerName, status: "out_for_delivery" }),
      });
    } catch (err) {
      console.error("assignDeliveryPartner error:", err);
    }
    addToast(`${partnerName} assigned to order`, "success");
  }, [addToast]);

  // ── Accept delivery ─────────────────────────────────────────────────────────
  const acceptDelivery = useCallback(async (orderId, partnerName) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, deliveryPartner: partnerName, status: "out_for_delivery" }
          : o
      )
    );
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryPartner: partnerName, status: "out_for_delivery" }),
      });
    } catch (err) {
      console.error("acceptDelivery error:", err);
    }
    addToast("Delivery accepted!", "success");
  }, [addToast]);

  // ── Reject delivery ─────────────────────────────────────────────────────────
  const rejectDelivery = useCallback(async (orderId) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "preparing", deliveryPartner: null } : o
      )
    );
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "preparing", deliveryPartner: null }),
      });
    } catch (err) {
      console.error("rejectDelivery error:", err);
    }
    addToast("Delivery rejected. Returning to preparation.", "warning");
  }, [addToast]);

  // ── Mark delivered ──────────────────────────────────────────────────────────
  const markDelivered = useCallback(async (orderId) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o))
    );
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
    } catch (err) {
      console.error("markDelivered error:", err);
    }
    addToast("Order delivered successfully!", "success");
  }, [addToast]);

  // ── Mark COD payment collected ──────────────────────────────────────────────
  const markCodCollected = useCallback(async (orderId, method) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, codPaymentReceived: true, codCollectionMethod: method }
          : o
      )
    );
    try {
      await fetch(`${API_URL}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codPaymentReceived: true, codCollectionMethod: method }),
      });
    } catch (err) {
      console.error("markCodCollected error:", err);
    }
    const label = method === "cash" ? "Cash received" : "UPI payment scanned";
    addToast(`${label} — ready to mark delivered!`, "success");
  }, [addToast]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const today = getLocalToday();
  const todayOrders = useMemo(
    () => orders.filter((o) => o.date === today),
    [orders, today]
  );

  const analytics = useMemo(
    () => ({
      totalOrders: todayOrders.length,
      revenue: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      activeDeliveries: todayOrders.filter((o) => o.status === "out_for_delivery").length,
      pending: todayOrders.filter((o) => o.status === "pending").length,
      preparing: todayOrders.filter((o) => o.status === "preparing").length,
      delivered: todayOrders.filter((o) => o.status === "delivered").length,
    }),
    [todayOrders]
  );

  // ── Get orders for a specific customer by phone number ──────────────────────
  const getCustomerOrders = useCallback(
    (phone) => {
      if (!phone) return [];
      return orders.filter((o) => o.phone === phone);
    },
    [orders]
  );

  return (
    <OrderContext.Provider
      value={{
        orders,
        todayOrders,
        analytics,
        toasts,
        serverOnline,
        addToast,
        updateOrderStatus,
        assignDeliveryPartner,
        acceptDelivery,
        rejectDelivery,
        markDelivered,
        markCodCollected,
        addOrder,
        getCustomerOrders,
        refreshOrders: fetchOrders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}
