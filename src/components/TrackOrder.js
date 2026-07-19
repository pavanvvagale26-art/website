import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaUser,
  FaPhone,
  FaMotorcycle,
  FaClock,
  FaRoute,
  FaSatelliteDish,
  FaDirections,
} from "react-icons/fa";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../App.css";

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Restaurant coordinates (SGS Restaurant)
const RESTAURANT_COORDS = { lat: 25.4484, lng: 78.5685 };

// Calculate distance (Haversine formula) in km
const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Estimate time based on average speed (30 km/h in city)
const getETA = (distanceKm) => {
  const avgSpeedKmH = 30;
  const timeHours = distanceKm / avgSpeedKmH;
  const timeMinutes = Math.round(timeHours * 60);
  if (timeMinutes < 1) return "Less than a min";
  if (timeMinutes === 1) return "1 min";
  return `${timeMinutes} mins`;
};

export default function TrackOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const deliveryMarkerRef = useRef(null);
  const routeLineRef = useRef(null);

  const { batch, customerInfo, deliveryPartner } = location.state || {};

  // Live delivery partner location (polled from localStorage)
  const [dpLocation, setDpLocation] = useState(null);
  const [dpInfo, setDpInfo] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isLive, setIsLive] = useState(false);

  // Calculate total
  const total = batch ? batch.reduce((sum, o) => sum + (o.total || 0), 0) : 0;
  const itemNames = batch ? batch.map((o) => o.item).join(", ") : "";

  // Poll delivery partner location from localStorage
  const pollLocation = useCallback(() => {
    try {
      const saved = localStorage.getItem("sgs_delivery_location");
      if (saved) {
        const data = JSON.parse(saved);
        const age = Date.now() - (data.timestamp || 0);

        // Only use if data is less than 60 seconds old
        if (age < 60000 && data.lat && data.lng) {
          setDpLocation({ lat: data.lat, lng: data.lng });
          setDpInfo({ name: data.partnerName, phone: data.phone });
          setIsLive(true);

          // Calculate distance and ETA to customer
          if (customerInfo?.coords?.lat && customerInfo?.coords?.lng) {
            const dist = getDistanceKm(
              data.lat, data.lng,
              customerInfo.coords.lat, customerInfo.coords.lng
            );
            setDistance(dist);
            setEta(getETA(dist));
          }
        } else {
          setIsLive(false);
        }
      }
    } catch (e) {
      console.error("Error polling delivery location:", e);
    }
  }, [customerInfo]);

  // Start polling every 5 seconds
  useEffect(() => {
    pollLocation(); // Initial poll
    const interval = setInterval(pollLocation, 5000);
    return () => clearInterval(interval);
  }, [pollLocation]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const customerCoords = customerInfo?.coords;
    const custLat = customerCoords?.lat || 25.4284;
    const custLng = customerCoords?.lng || 78.5485;

    const map = L.map(mapRef.current, {
      center: [custLat, custLng],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Restaurant marker (red)
    const restaurantIcon = L.divIcon({
      className: "custom-marker restaurant-marker",
      html: `<div class="marker-pin restaurant-pin">
               <svg viewBox="0 0 24 24" width="24" height="24" fill="#ef4444"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
             </div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42],
    });

    L.marker([RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng], { icon: restaurantIcon })
      .addTo(map)
      .bindPopup("<strong>SGS Restaurant</strong>");

    // Customer marker (blue)
    const customerIcon = L.divIcon({
      className: "custom-marker customer-marker",
      html: `<div class="marker-pin customer-pin">
               <svg viewBox="0 0 24 24" width="24" height="24" fill="#3b82f6"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
             </div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
      popupAnchor: [0, -42],
    });

    L.marker([custLat, custLng], { icon: customerIcon })
      .addTo(map)
      .bindPopup(`<strong>Your Location</strong><br/>${customerInfo?.location || "Customer"}`);

    // Draw route from restaurant to customer
    L.polyline(
      [
        [RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng],
        [custLat, custLng],
      ],
      {
        color: "#94a3b8",
        weight: 3,
        opacity: 0.4,
        dashArray: "8, 8",
      }
    ).addTo(map);

    // Fit bounds
    const bounds = L.latLngBounds([
      [RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng],
      [custLat, custLng],
    ]);
    map.fitBounds(bounds.pad(0.3));

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [customerInfo]);

  // Update delivery partner marker on map when dpLocation changes
  useEffect(() => {
    if (!mapInstanceRef.current || !dpLocation) return;

    const map = mapInstanceRef.current;

    // Create or update the delivery marker
    const deliveryIcon = L.divIcon({
      className: "custom-marker delivery-marker",
      html: `<div class="marker-pin delivery-pin live-delivery-pin">
               <svg viewBox="0 0 24 24" width="22" height="22" fill="#f97316"><path d="M19.15 8a2 2 0 0 0-1.72-1H15V5a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v10h2a3 3 0 0 0 6 0h2a3 3 0 0 0 6 0h2v-5a1.43 1.43 0 0 0-.15-.62zM7 17.5A1.5 1.5 0 1 1 8.5 16 1.5 1.5 0 0 1 7 17.5zm10 0a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5zM15 9h2.43l1.8 3H15z"/></svg>
             </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (deliveryMarkerRef.current) {
      // Update position with smooth animation
      deliveryMarkerRef.current.setLatLng([dpLocation.lat, dpLocation.lng]);
    } else {
      // Create new marker
      deliveryMarkerRef.current = L.marker([dpLocation.lat, dpLocation.lng], {
        icon: deliveryIcon,
        zIndexOffset: 1000,
      })
        .addTo(map)
        .bindPopup(
          `<strong>${dpInfo?.name || deliveryPartner || "Delivery Partner"}</strong><br/>🟢 Live Location`
        );
    }

    // Draw/update route line from delivery partner to customer
    const custLat = customerInfo?.coords?.lat || 25.4284;
    const custLng = customerInfo?.coords?.lng || 78.5485;

    if (routeLineRef.current) {
      routeLineRef.current.setLatLngs([
        [dpLocation.lat, dpLocation.lng],
        [custLat, custLng],
      ]);
    } else {
      routeLineRef.current = L.polyline(
        [
          [dpLocation.lat, dpLocation.lng],
          [custLat, custLng],
        ],
        {
          color: "#f97316",
          weight: 4,
          opacity: 0.8,
          dashArray: null,
        }
      ).addTo(map);
    }

    // Fit bounds to show all markers
    const bounds = L.latLngBounds([
      [dpLocation.lat, dpLocation.lng],
      [custLat, custLng],
      [RESTAURANT_COORDS.lat, RESTAURANT_COORDS.lng],
    ]);
    map.fitBounds(bounds.pad(0.2));
  }, [dpLocation, dpInfo, deliveryPartner, customerInfo]);

  // Open Google Maps navigation from delivery partner to customer
  const openNavigation = () => {
    const custLat = customerInfo?.coords?.lat;
    const custLng = customerInfo?.coords?.lng;
    if (custLat && custLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}&travelmode=driving`;
      window.open(url, "_blank");
    } else if (customerInfo?.location) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(customerInfo.location)}&travelmode=driving`;
      window.open(url, "_blank");
    }
  };

  if (!batch || !customerInfo) {
    return (
      <div className="trackorder-page fade-in">
        <div className="trackorder-container">
          <div className="myorders-header">
            <button className="myorders-back-btn" onClick={() => navigate("/my-orders")}>
              <FaArrowLeft />
            </button>
            <h1>Track Order</h1>
          </div>
          <div className="myorders-empty">
            <FaMotorcycle />
            <h3>No Order Data</h3>
            <p>Please go to My Orders and select an order to track.</p>
            <button onClick={() => navigate("/my-orders")} className="myorders-goto-menu-btn">
              Go to My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="trackorder-page fade-in">
      <div className="trackorder-container">
        {/* Header */}
        <div className="myorders-header">
          <button className="myorders-back-btn" onClick={() => navigate("/my-orders")}>
            <FaArrowLeft />
          </button>
          <h1>Track Order</h1>
        </div>

        {/* Live ETA Banner */}
        {isLive && eta && (
          <div className="trackorder-eta-banner">
            <div className="eta-banner-left">
              <div className="eta-live-dot"></div>
              <FaSatelliteDish className="eta-live-icon" />
              <span className="eta-live-text">LIVE TRACKING</span>
            </div>
            <div className="eta-banner-center">
              <FaClock className="eta-clock-icon" />
              <span className="eta-time">{eta}</span>
              <span className="eta-label">Estimated Arrival</span>
            </div>
            <div className="eta-banner-right">
              <FaRoute />
              <span>{distance ? `${distance.toFixed(1)} km away` : ""}</span>
            </div>
          </div>
        )}

        {/* Order Info Card */}
        <div className="trackorder-info-card">
          <h3 className="trackorder-restaurant-name">SGS Restaurant</h3>

          <div className="trackorder-detail-row">
            <span className="trackorder-label">Items:</span>
            <span className="trackorder-value">{itemNames}</span>
          </div>

          <div className="trackorder-detail-row">
            <span className="trackorder-label">Subtotal:</span>
            <span className="trackorder-value">₹{total}</span>
          </div>

          <div className="trackorder-detail-row trackorder-address-row">
            <span className="trackorder-label">
              <FaMapMarkerAlt /> Customer Address:
            </span>
            <span className="trackorder-value trackorder-address">
              {customerInfo.location}
            </span>
          </div>

          {/* Delivery Partner Info */}
          {(deliveryPartner || dpInfo) && (
            <div className="trackorder-delivery-section">
              <h4 className="trackorder-delivery-title">
                <FaMotorcycle /> Delivery Partner
              </h4>
              <div className="trackorder-delivery-info">
                <div className="trackorder-dp-card">
                  <div className="dp-card-avatar">
                    <FaMotorcycle />
                  </div>
                  <div className="dp-card-details">
                    <p className="dp-card-name">
                      <FaUser /> {dpInfo?.name || deliveryPartner}
                    </p>
                    {(dpInfo?.phone || batch[0]?.phone) && (
                      <p className="dp-card-phone">
                        <FaPhone /> {dpInfo?.phone || batch[0]?.phone}
                      </p>
                    )}
                    {isLive && dpLocation && (
                      <p className="dp-card-location">
                        <FaMapMarkerAlt />
                        <span className="dp-live-badge">● LIVE</span>
                        {dpLocation.lat.toFixed(4)}, {dpLocation.lng.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Navigation Button */}
              <button className="trackorder-navigate-btn" onClick={openNavigation}>
                <FaDirections /> Open Navigation to Delivery
              </button>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="trackorder-map-wrapper">
          <div ref={mapRef} className="trackorder-map" id="track-order-map"></div>

          {/* Map Legend */}
          <div className="trackorder-map-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#ef4444" }}></span>
              Restaurant
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: "#3b82f6" }}></span>
              Your Location
            </div>
            {isLive && (
              <div className="legend-item">
                <span className="legend-dot legend-pulse" style={{ background: "#f97316" }}></span>
                Delivery Partner (Live)
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
