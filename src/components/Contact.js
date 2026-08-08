import React, { useContext } from "react";
import { FaInstagram, FaFacebook, FaWhatsapp } from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";
import "../App.css";

export default function Contact() {
  const { user, setShowCustomerAuthModal } = useContext(AuthContext);

  const handleSendMessage = () => {
    if (!user) {
      setShowCustomerAuthModal(true);
      return;
    }
    // TODO: actual message submission logic
    alert("Message sent successfully!");
  };

  return (
    <div className="contact-page">

      {/* TOP SECTION */}
      <div className="contact-top">
        <h1>Get in Touch</h1>
        <p>Have questions? We’d love to hear from you.</p>
      </div>

      {/* MAIN SECTION (2 COLUMN LAYOUT) */}
      <div className="contact-main">

        {/* LEFT: CONTACT FORM */}
        <div className="contact-form">
          <h2>Send Us a Message</h2>
          <input type="text" placeholder="Your Name" />
          <input type="email" placeholder="Your Email" />
          <input type="text" placeholder="Phone (optional)" />
          <textarea placeholder="Your Message"></textarea>
          <button className="contact-submit" onClick={handleSendMessage}>Send Message</button>
        </div>

        {/* RIGHT: INFO CARDS */}
        <div className="contact-info">

          <div className="info-card">
            <h3>📍 Address</h3>
            <p>SGS Nonveg Gundu Palav</p>
            <p>21, K.V. Temple Street, 2nd Cross</p>
            <p>Sowrastrapet Circle, near Balepet,</p>
            <p>Bengaluru, Karnataka 560053</p>
          </div>

          <div className="info-card">
            <h3>🕒 Timings</h3>
            <p><strong>Sunday:</strong> 8 am – 3 pm</p>
            <p><strong>Monday:</strong> Closed</p>
            <p><strong>Tue – Fri:</strong> 10 am–3 pm, 6–9:30 pm</p>
            <p><strong>Saturday:</strong> Closed</p>
          </div>

          <div className="info-card">
            <h3>📞 Contact</h3>
            <p>Phone: — (Add later)</p>
            <p>Email: info@sgspalav.com</p>
          </div>

          {/* SOCIAL MEDIA */}
          <div className="info-card social-card">
            <h3>🌐 Follow Us</h3>

            <div className="social-icons">
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
                <FaInstagram />
              </a>

              <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
                <FaFacebook />
              </a>

              <a href="https://wa.me/91XXXXXXXXXX" target="_blank" rel="noreferrer">
                <FaWhatsapp />
              </a>
            </div>
          </div>

        </div> {/* <-- closes contact-info */}

      </div> {/* <-- closes contact-main */}

      {/* MAP SECTION */}
      <div className="contact-map">
        <iframe
          title="SGS Location"
          src="https://www.google.com/maps?q=Sowrastrapet%20Circle%2C%20Bengaluru&output=embed"
          width="100%"
          height="350"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
        ></iframe>
      </div>

    </div>
  );
}
