import React, { createContext, useState, useEffect, useCallback, useMemo } from "react";

export const OrderContext = createContext();

// Helper to get today's date string in local time (not UTC)
const getLocalToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Read orders from localStorage (no dummy data — only real customer orders)
const loadOrdersFromStorage = () => {
  try {
    const saved = localStorage.getItem("sgs_orders");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading orders from storage:", e);
  }
  return [];
};

export function OrderProvider({ children }) {
  const [orders, setOrders] = useState(() => loadOrdersFromStorage());

  const [toasts, setToasts] = useState([]);

  // Save to localStorage whenever orders change
  useEffect(() => {
    localStorage.setItem("sgs_orders", JSON.stringify(orders));
  }, [orders]);

  // Cross-tab synchronization: listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "sgs_orders" && e.newValue) {
        try {
          const updatedOrders = JSON.parse(e.newValue);
          setOrders(updatedOrders);
        } catch (err) {
          console.error("Error parsing synced orders:", err);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Also poll localStorage periodically for same-tab sync (in case storage event doesn't fire)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      try {
        const saved = localStorage.getItem("sgs_orders");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Only update if the data has actually changed (compare lengths and last order id)
          if (parsed.length !== orders.length ||
            (parsed[0] && orders[0] && parsed[0].id !== orders[0].id) ||
            (parsed[0] && orders[0] && parsed[0].status !== orders[0].status)) {
            setOrders(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 2000); // Check every 2 seconds
    return () => clearInterval(syncInterval);
  }, [orders]);

  // No auto-refresh with sample data — orders come only from real customers

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const updateOrderStatus = useCallback((orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      )
    );
    const statusLabels = {
      accepted: "Order Accepted",
      preparing: "Order is being Prepared",
      out_for_delivery: "Order is Out for Delivery",
      delivered: "Order Delivered",
    };
    addToast(statusLabels[newStatus] || `Status: ${newStatus}`, "success");
  }, [addToast]);

  const assignDeliveryPartner = useCallback((orderId, partnerName) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, deliveryPartner: partnerName, status: "out_for_delivery" } : o
      )
    );
    addToast(`${partnerName} assigned to order`, "success");
  }, [addToast]);

  const acceptDelivery = useCallback((orderId, partnerName) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, deliveryPartner: partnerName, status: "out_for_delivery" } : o
      )
    );
    addToast("Delivery accepted!", "success");
  }, [addToast]);

  const rejectDelivery = useCallback((orderId) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "preparing", deliveryPartner: null } : o
      )
    );
    addToast("Delivery rejected. Returning to preparation.", "warning");
  }, [addToast]);

  const markDelivered = useCallback((orderId) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "delivered" } : o
      )
    );
    addToast("Order delivered successfully!", "success");
  }, [addToast]);

  // Mark COD payment as collected at doorstep (method: "cash" | "upi_scan")
  const markCodCollected = useCallback((orderId, method) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, codPaymentReceived: true, codCollectionMethod: method }
          : o
      )
    );
    const label = method === "cash" ? "Cash received" : "UPI payment scanned";
    addToast(`${label} — ready to mark delivered!`, "success");
  }, [addToast]);

  // Daily analytics - use useMemo to recalculate properly when orders change
  const today = getLocalToday();
  const todayOrders = useMemo(() => {
    return orders.filter((o) => o.date === today);
  }, [orders, today]);

  const analytics = useMemo(() => ({
    totalOrders: todayOrders.length,
    revenue: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
    activeDeliveries: todayOrders.filter((o) => o.status === "out_for_delivery").length,
    pending: todayOrders.filter((o) => o.status === "pending").length,
    preparing: todayOrders.filter((o) => o.status === "preparing").length,
    delivered: todayOrders.filter((o) => o.status === "delivered").length,
  }), [todayOrders]);

  // Add a new order (from customer checkout)
  const addOrder = useCallback((orderData) => {
    const newOrder = {
      id: `ORD-${Date.now()}`,
      ...orderData,
      status: "pending",
      deliveryPartner: null,
      createdAt: new Date().toISOString(),
      date: getLocalToday(),
    };
    setOrders((prev) => {
      const updated = [newOrder, ...prev];
      // Immediately persist to localStorage for cross-tab sync
      localStorage.setItem("sgs_orders", JSON.stringify(updated));
      return updated;
    });
    addToast("New order placed!", "info");
  }, [addToast]);

  // Get orders for a specific customer by phone number
  const getCustomerOrders = useCallback((phone) => {
    if (!phone) return [];
    return orders.filter((o) => o.phone === phone);
  }, [orders]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        todayOrders,
        analytics,
        toasts,
        addToast,
        updateOrderStatus,
        assignDeliveryPartner,
        acceptDelivery,
        rejectDelivery,
        markDelivered,
        markCodCollected,
        addOrder,
        getCustomerOrders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}
