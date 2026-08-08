import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

/**
 * ProtectedRoute — wraps routes that require authentication.
 * Shows a loading spinner while auth state is being determined,
 * redirects to /login if unauthenticated, or renders children if authenticated.
 */
export default function ProtectedRoute({ children }) {
  const { user, authLoading } = useContext(AuthContext);

  // Still checking auth state (e.g. verifying token on page refresh)
  if (authLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "#1a1a2e",
        }}
      >
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated → render the route
  return children;
}
