import React, { useLayoutEffect } from "react";
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
import AllReviews from "./components/AllReviews";
import LoginModal from "./components/LoginModal";
import CustomerAuthModal from "./components/CustomerAuthModal";
import Toast from "./components/Toast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { CartProvider } from "./context/CartContext";
import { MenuProvider } from "./context/MenuContext";
import { AuthProvider } from "./context/AuthContext";
import { OrderProvider } from "./context/OrderContext";
import { ReviewProvider } from "./context/ReviewContext";
import { GalleryProvider } from "./context/GalleryContext";
import "./responsive.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch (e) {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const root = document.getElementById("root");
    if (root) {
      root.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <MenuProvider>
          <CartProvider>
            <OrderProvider>
              <ReviewProvider>
                <GalleryProvider>
                  <ScrollToTop />
                  <Navbar />
                  <LoginModal />
                  <CustomerAuthModal />
                  <Toast />
                  <Routes>
                    {/* Public routes — auth pages */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Public customer routes — auth popup shown on protected actions */}
                    <Route path="/" element={<Home />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/my-orders" element={<MyOrders />} />
                    <Route path="/track-order" element={<TrackOrder />} />
                    <Route path="/reviews" element={<AllReviews />} />

                    {/* Admin / Delivery panels — use their own LoginModal auth */}
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/delivery" element={<DeliveryPanel />} />
                  </Routes>
                </GalleryProvider>
              </ReviewProvider>
            </OrderProvider>
          </CartProvider>
        </MenuProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
