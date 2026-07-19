import React, { createContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext();

// ─── Hardcoded credentials (no backend required) ───
const STATIC_USERS = [
  {
    id: "admin-001",
    name: "Admin",
    email: "admin@sgs.com",
    password: "admin123",
    role: "admin",
  },
  {
    id: "delivery-001",
    name: "Delivery Partner",
    email: "delivery@sgs.com",
    password: "delivery123",
    role: "delivery",
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("sgs_auth_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem("sgs_auth_token") || null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Delivery setup state
  const [showDeliverySetup, setShowDeliverySetup] = useState(false);
  const [pendingDeliveryLogin, setPendingDeliveryLogin] = useState(null);

  // Persist auth state
  useEffect(() => {
    if (user && token) {
      localStorage.setItem("sgs_auth_user", JSON.stringify(user));
      localStorage.setItem("sgs_auth_token", token);
    } else {
      localStorage.removeItem("sgs_auth_user");
      localStorage.removeItem("sgs_auth_token");
    }
  }, [user, token]);

  // ─── Login (local, no server needed) ───
  const login = async (email, password) => {
    setLoading(true);

    // Simulate a small delay for UX
    await new Promise((r) => setTimeout(r, 500));

    const matched = STATIC_USERS.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );

    setLoading(false);

    if (!matched) {
      return { success: false, message: "Invalid email or password." };
    }

    const { password: _pw, ...safeUser } = matched;
    const fakeToken = btoa(`${safeUser.id}:${Date.now()}`);

    // If delivery role, show setup screen first
    if (safeUser.role === "delivery") {
      setPendingDeliveryLogin({ ...safeUser, token: fakeToken });
      setShowDeliverySetup(true);
      setShowLoginModal(false);
      return { success: true, needsSetup: true };
    }

    setUser(safeUser);
    setToken(fakeToken);
    setShowLoginModal(false);
    return { success: true, user: safeUser };
  };

  // ─── Complete Delivery Setup ───
  const completeDeliveryLogin = useCallback(
    (name, phone, location) => {
      if (!pendingDeliveryLogin) return;
      const deliveryUser = {
        ...pendingDeliveryLogin,
        name,
        phone,
        locationCoords: location,
      };
      const deliveryToken = pendingDeliveryLogin.token;
      delete deliveryUser.token;

      setUser(deliveryUser);
      setToken(deliveryToken);
      setShowDeliverySetup(false);
      setPendingDeliveryLogin(null);

      const locationData = {
        partnerName: name,
        phone,
        lat: location?.lat || null,
        lng: location?.lng || null,
        timestamp: Date.now(),
      };
      localStorage.setItem("sgs_delivery_location", JSON.stringify(locationData));
    },
    [pendingDeliveryLogin]
  );

  // Cancel delivery setup
  const cancelDeliverySetup = useCallback(() => {
    setShowDeliverySetup(false);
    setPendingDeliveryLogin(null);
  }, []);

  // Update delivery location
  const updateDeliveryLocation = useCallback(
    (lat, lng) => {
      if (!user || user.role !== "delivery") return;
      const locationData = {
        partnerName: user.name,
        phone: user.phone,
        lat,
        lng,
        timestamp: Date.now(),
      };
      localStorage.setItem("sgs_delivery_location", JSON.stringify(locationData));
    },
    [user]
  );

  // ─── Logout ───
  const logout = () => {
    if (user && user.role === "delivery") {
      localStorage.removeItem("sgs_delivery_location");
    }
    setUser(null);
    setToken(null);
  };

  // Helper: get auth headers
  const getAuthHeaders = useCallback(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        showLoginModal,
        setShowLoginModal,
        showDeliverySetup,
        pendingDeliveryLogin,
        completeDeliveryLogin,
        cancelDeliverySetup,
        updateDeliveryLocation,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
