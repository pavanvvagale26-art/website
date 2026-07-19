import React, { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaShoppingCart, FaUserShield, FaClipboardList } from "react-icons/fa";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import "../App.css";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart } = useContext(CartContext);
  const { user, setShowLoginModal } = useContext(AuthContext);

  const handleAdminClick = () => {
    if (user) {
      if (user.role === "admin") navigate("/admin");
      else navigate("/delivery");
    } else {
      setShowLoginModal(true);
    }
  };

  // Hide navbar on admin/delivery panels
  if (location.pathname === "/admin" || location.pathname === "/delivery") {
    return null;
  }

  return (
    <nav className="burger-nav">

      <div className="nav-left">
        <img
          src="/logo.png"
          alt="Logo"
          className="burger-logo"
          onClick={() => navigate("/")}
        />
      </div>

      <ul className="nav-menu">
        <li><Link to="/">HOME</Link></li>
        <li><Link to="/about">ABOUT US</Link></li>
        <li><Link to="/menu">MENU</Link></li>
        <li><Link to="/gallery">GALLERY</Link></li>
        <li><Link to="/contact">CONTACT</Link></li>
      </ul>

      <div className="nav-right">
        <button className="cart-button" onClick={() => navigate("/cart")}>
          <FaShoppingCart /> Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})
        </button>

        <button className="myorders-nav-btn" onClick={() => navigate("/my-orders")}>
          <FaClipboardList /> My Orders
        </button>

        <button className="admin-icon-btn" onClick={handleAdminClick} title={user ? `${user.name} (${user.role})` : "Admin Login"}>
          <FaUserShield />
          {user && <span className="admin-online-dot"></span>}
        </button>
      </div>

    </nav>
  );

}
