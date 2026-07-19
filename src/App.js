import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Menu from "./components/Menu";
import About from "./components/About";
import Gallery from "./components/Gallery";
import Contact from "./components/Contact";
import Cart from "./components/Cart";
import AdminPanel from "./components/AdminPanel";
import DeliveryPanel from "./components/DeliveryPanel";
import MyOrders from "./components/MyOrders";
import TrackOrder from "./components/TrackOrder";
import LoginModal from "./components/LoginModal";
import Toast from "./components/Toast";
import { CartProvider } from "./context/CartContext";
import { MenuProvider } from "./context/MenuContext";
import { AuthProvider } from "./context/AuthContext";
import { OrderProvider } from "./context/OrderContext";
import "./responsive.css";

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <MenuProvider>
        <CartProvider>
          <OrderProvider>
            <Router>
              <ScrollToTop />
              <Navbar />
              <LoginModal />
              <Toast />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/about" element={<About />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/delivery" element={<DeliveryPanel />} />
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/track-order" element={<TrackOrder />} />
              </Routes>
            </Router>
          </OrderProvider>
        </CartProvider>
      </MenuProvider>
    </AuthProvider>
  );
}

export default App;
