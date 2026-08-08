import React, { useContext, useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FaShoppingCart,
  FaClipboardList,
  FaSignOutAlt,
  FaUserCircle,
  FaHome,
  FaInfoCircle,
  FaUtensils,
  FaImages,
  FaPhoneAlt,
} from "react-icons/fa";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import "../App.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useContext(CartContext);
  const { user, setShowCustomerAuthModal, logout } = useContext(AuthContext);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowProfileDropdown(false);
    logout();
    navigate("/");
  };

  // Auth-gated navigation: show popup if not logged in
  const handleCartClick = () => {
    if (!user) {
      setShowCustomerAuthModal(true);
    } else {
      navigate("/cart");
    }
  };

  const handleMyOrdersClick = () => {
    if (!user) {
      setShowCustomerAuthModal(true);
    } else {
      navigate("/my-orders");
    }
  };

  const handleProfileClick = () => {
    if (!user) {
      setShowCustomerAuthModal(true);
    } else {
      setShowProfileDropdown((prev) => !prev);
    }
  };

  // Hide navbar on admin/delivery panels and auth pages
  if (
    location.pathname === "/admin" ||
    location.pathname === "/delivery" ||
    location.pathname === "/login" ||
    location.pathname === "/signup"
  ) {
    return null;
  }

  const totalCartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const bottomNavItems = [
    { to: "/",        icon: <FaHome />,      label: "Home"    },
    { to: "/about",   icon: <FaInfoCircle />, label: "About"   },
    { to: "/menu",    icon: <FaUtensils />,   label: "Menu"    },
    { to: "/gallery", icon: <FaImages />,     label: "Gallery" },
    { to: "/contact", icon: <FaPhoneAlt />,   label: "Contact" },
  ];

  return (
    <>
      {/* ── TOP NAVBAR ── */}
      <nav className="burger-nav">
        {/* Brand Logo — left */}
        <div className="nav-left">
          <img
            src="/logo.png"
            alt="SGS Logo"
            className="burger-logo"
            onClick={() => navigate("/")}
          />
        </div>

        {/* Navigation Links — center (hidden on mobile ≤750px via CSS) */}
        <ul className="nav-menu">
          <li><Link to="/">HOME</Link></li>
          <li><Link to="/about">ABOUT</Link></li>
          <li><Link to="/menu">MENU</Link></li>
          <li><Link to="/gallery">GALLERY</Link></li>
          <li><Link to="/contact">CONTACT</Link></li>
        </ul>

        {/* Right Action Buttons — Cart, Orders, Profile */}
        <div className="nav-right-header">
          {/* Cart Button */}
          <button className="cart-button" onClick={handleCartClick} title="Cart">
            <FaShoppingCart className="cart-icon" />
            <span className="cart-text">Cart</span>
            <span className="cart-count-badge">{totalCartCount}</span>
          </button>

          {/* My Orders Button */}
          <button className="myorders-nav-btn" onClick={handleMyOrdersClick} title="My Orders">
            <FaClipboardList className="myorders-nav-icon" />
            <span className="myorders-nav-text">Orders</span>
          </button>

          {/* Profile / Login Button */}
          <div className="nav-profile-wrapper" ref={dropdownRef}>
            <button
              className={`nav-profile-btn ${user ? "nav-profile-logged-in" : ""}`}
              onClick={handleProfileClick}
              title={user ? user.name : "Sign In"}
            >
              <FaUserCircle className="nav-profile-icon" />
              <span className="nav-profile-name">{user ? user.name.split(" ")[0] : "Login"}</span>
            </button>

            {/* Profile Dropdown */}
            {showProfileDropdown && user && (
              <div className="nav-profile-dropdown">
                <div className="nav-profile-dropdown-header">
                  <FaUserCircle className="nav-dropdown-avatar" />
                  <div className="nav-dropdown-info">
                    <span className="nav-dropdown-name">{user.name || "User"}</span>
                    <span className="nav-dropdown-email">{user.email}</span>
                  </div>
                </div>
                <div className="nav-profile-dropdown-divider" />
                <button className="nav-dropdown-logout" onClick={handleLogout}>
                  <FaSignOutAlt /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── BOTTOM NAV BAR — only visible on mobile ≤750px (hidden on desktop via CSS) ── */}
      <nav className="bottom-nav-bar">
        {bottomNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`bottom-nav-item${location.pathname === item.to ? " active" : ""}`}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
