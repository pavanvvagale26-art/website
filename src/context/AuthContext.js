import React, { createContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// ─── Hardcoded credentials for Admin / Delivery (no backend needed) ───
const STATIC_USERS = [
  // ── Admin accounts ──
  {
    id: "admin-001",
    name: "Admin",
    email: "admin@sgs.com",
    password: "admin123",
    role: "admin",
  },
  {
    id: "admin-002",
    name: "Admin 2",
    email: "admin2@sgs.com",
    password: "admin123",
    role: "admin",
  },
  {
    id: "admin-003",
    name: "Pavan",
    email: "pavan@sgs.com",
    password: "pavan123",
    role: "admin",
  },
  // ── Delivery partner accounts ──
  {
    id: "delivery-001",
    name: "Delivery Partner 1",
    email: "delivery1@sgs.com",
    password: "delivery123",
    role: "delivery",
  },
  {
    id: "delivery-002",
    name: "Delivery Partner 2",
    email: "delivery2@sgs.com",
    password: "delivery123",
    role: "delivery",
  },
  {
    id: "delivery-003",
    name: "Delivery Partner 3",
    email: "delivery3@sgs.com",
    password: "delivery123",
    role: "delivery",
  },
  {
    id: "delivery-004",
    name: "Delivery Partner 4",
    email: "delivery4@sgs.com",
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
  const [showCustomerAuthModal, setShowCustomerAuthModal] = useState(false);
  const [loading, setLoading] = useState(false);
  // authLoading = true while we verify the token on initial page load
  const [authLoading, setAuthLoading] = useState(true);

  // Delivery setup state
  const [showDeliverySetup, setShowDeliverySetup] = useState(false);
  const [pendingDeliveryLogin, setPendingDeliveryLogin] = useState(null);

  // ─── Persist auth state ───
  useEffect(() => {
    if (user && token) {
      localStorage.setItem("sgs_auth_user", JSON.stringify(user));
      localStorage.setItem("sgs_auth_token", token);
    } else {
      localStorage.removeItem("sgs_auth_user");
      localStorage.removeItem("sgs_auth_token");
    }
  }, [user, token]);

  // ─── Verify session on mount (page refresh) ───
  useEffect(() => {
    const verifySession = async () => {
      const savedUser = localStorage.getItem("sgs_auth_user");
      const savedToken = localStorage.getItem("sgs_auth_token");

      if (!savedUser || !savedToken) {
        setAuthLoading(false);
        return;
      }

      const parsed = JSON.parse(savedUser);

      // Admin/delivery users use STATIC_USERS — no backend verification needed
      if (parsed.role === "admin" || parsed.role === "delivery") {
        setAuthLoading(false);
        return;
      }

      // Customer users — verify JWT with backend
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
          }
        } else {
          // Token invalid/expired — clear auth
          setUser(null);
          setToken(null);
        }
      } catch {
        // Network error — keep the cached user to allow offline browsing
        // They'll need to re-login when they try to do something that needs the server
      }

      setAuthLoading(false);
    };

    verifySession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Re-register delivery partner on page load ───
  useEffect(() => {
    if (user && user.role === "delivery" && user.name) {
      fetch(`${API_URL}/delivery-partners/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, phone: user.phone || "" }),
      }).catch(() => { });
    }
  }, [user]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN — checks STATIC_USERS first (admin/delivery), then backend (customer)
  // ═══════════════════════════════════════════════════════════════════════════
  const login = async (email, password) => {
    setLoading(true);

    // ── Check static admin/delivery users first ──
    const matched = STATIC_USERS.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password
    );

    if (matched) {
      const { password: _pw, ...safeUser } = matched;
      const fakeToken = btoa(`${safeUser.id}:${Date.now()}`);

      // If delivery role, show setup screen first
      if (safeUser.role === "delivery") {
        setPendingDeliveryLogin({ ...safeUser, token: fakeToken });
        setShowDeliverySetup(true);
        setShowLoginModal(false);
        setLoading(false);
        return { success: true, needsSetup: true };
      }

      setUser(safeUser);
      setToken(fakeToken);
      setShowLoginModal(false);
      setLoading(false);
      return { success: true, user: safeUser };
    }

    // ── Not a static user → call backend API ──
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        setShowLoginModal(false);
        return { success: true, user: data.user };
      }

      return { success: false, message: data.message || "Invalid email or password." };
    } catch (err) {
      setLoading(false);
      return { success: false, message: "Server is unreachable. Please try again later." };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNUP — creates a new customer account via backend
  // ═══════════════════════════════════════════════════════════════════════════
  const signup = async (name, email, phone, password, confirmPassword) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, confirmPassword }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        // Do NOT auto-login — customer must sign in separately
        return { success: true, message: data.message || "Account created successfully!" };
      }

      return { success: false, message: data.message || "Signup failed." };
    } catch (err) {
      setLoading(false);
      return { success: false, message: "Server is unreachable. Please try again later." };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // GOOGLE LOGIN — verifies Google credential with backend
  // ═══════════════════════════════════════════════════════════════════════════
  const googleLogin = async (credential) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok && data.success) {
        setUser(data.user);
        setToken(data.token);
        return { success: true, user: data.user };
      }

      return { success: false, message: data.message || "Google login failed." };
    } catch (err) {
      setLoading(false);
      return { success: false, message: "Server is unreachable. Please try again later." };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE DELIVERY SETUP (preserved from original)
  // ═══════════════════════════════════════════════════════════════════════════
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

      // Register with server so the cyclic assignment system knows we're available
      fetch(`${API_URL}/delivery-partners/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      }).catch((err) => console.error("Partner register error:", err));
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

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════════════
  const logout = () => {
    if (user && user.role === "delivery") {
      localStorage.removeItem("sgs_delivery_location");
      // Unregister from server so cyclic assignment skips us
      fetch(`${API_URL}/delivery-partners/unregister`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name }),
      }).catch((err) => console.error("Partner unregister error:", err));
    }
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authLoading,
        login,
        signup,
        googleLogin,
        logout,
        showLoginModal,
        setShowLoginModal,
        showCustomerAuthModal,
        setShowCustomerAuthModal,
        showDeliverySetup,
        pendingDeliveryLogin,
        completeDeliveryLogin,
        cancelDeliverySetup,
        updateDeliveryLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
