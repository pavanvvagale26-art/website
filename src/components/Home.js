import React from "react";
import "../App.css";
import { FaFacebookF, FaInstagram, FaWhatsapp, } from "react-icons/fa";
import { useNavigate } from "react-router-dom";





export default function Home() {
  const navigate = useNavigate();

  const goTo = (path) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(path);
  };

  return (
    <div className="home-container">

      {/* ===== 1. HERO SECTION ===== */}
      <section className="section hero-section">
        <div className="hero-inner">
        <div className="hero-left">
          <h1><span>SGS</span>
            <span> GUNDU PALAV</span></h1>
          <h2>Since <span>1989.</span></h2>
          <p>Authentic South Indian taste crafted with tradition, rich spices, and heritage recipes that everyone deserves to experience.</p>
          <button className="btn-red" onClick={() => goTo("/menu")}>Order Now</button>
        </div>

        <div className="hero-right">
          <img src="/burger.png" alt="Food" />
        </div>
        </div>
      </section>


      {/* ===== 2. ABOUT SECTION ===== */}
      <section className="section about-section">
          
        <div className="about-image">
          <img src="/about-bg.jpg" alt="About" />
        </div>
        <div className="about-text">
         <h1 className="about-title">ABOUT US</h1>
          <h3>The Story of SGS Nonveg Gundu Palav</h3>
          <p>
            For years, SGS Nonveg Gundu Palav has been delighting Bengaluru with authentic South Indian flavors and our famous signature Gundu Palav. Known for quality, consistency, and rich taste, we combine traditional cooking methods with fresh ingredients to create meals that keep our customers coming back.
          </p>
          <p>It is a hidden gem known more by word of mouth than by maps. Though it may appear on GPS, locals know exactly where to guide you — and some may even walk you to the spot themselves...</p>
          <button className="btn-red" onClick={() => goTo("/about")}>
  Read More
</button>
        </div>
        
      </section>


      {/* ===== 3. MENU SECTION ===== */}
      <section className="section menu-section">
        <h1>OUR SPECIAL <span>MENU</span></h1>
        <p>Discover the rich flavors of South India through our carefully crafted menu.</p>

        <div className="menu-grid">
          <div className="menu-card">
            <img src="/menu/chicken-palav.jpg" alt="Chicken Palav" />
            <h4>Chicken Palav</h4>
          </div>

          <div className="menu-card">
            <img src="/menu/mutton.jpg" alt="Mutton Palav" />
            <h4>Mutton Palav</h4>
          </div>

          <div className="menu-card">
            <img src="/menu/kshatriya.jpg" alt="Kshatriya" />
            <h4>Chicken Kshatriya</h4>
          </div>

          <div className="menu-card">
            <img src="/menu/chilly.jpg" alt="Chilly Chicken" />
            <h4> Chilly Chicken </h4>
        </div>
        
        </div>
          <button className="btnn-red" onClick={() => goTo("/menu")}>View More</button>
      </section>


      {/* ===== 4. GALLERY SECTION ===== */}
      <section className="section gallery-section">
        <h1>OUR <span>GALLERY</span></h1>
        <p>Take a glimpse into the vibrant flavors and moments at SGS Nonveg Gundu Palav.</p>

        <div className="gallery-grid">
          <img src="/gallery/img1.jpg" alt="Gallery" />
          <img src="/gallery/img2.jpg" alt="Gallery" />
          <img src="/gallery/img8.jpg" alt="Gallery" />
          <img src="/gallery/img4.jpg" alt="Gallery" />
           <img src="/gallery/img6.jpg" alt="Gallery" />
        </div>
          <button className="btn3-red" onClick={() => goTo("/gallery")}>View More</button>
      </section>


      {/* ===== REVIEWS SECTION ===== */}
<section className="section review-section" id="reviews">
  <h1 className="section-title">CUSTOMER <span>REVIEWS</span></h1>

  <div className="review-grid">
    <div className="review-card">
      <img src="/menu/customer.jpg" alt="Customer" />
      <h4>— Pavan V.</h4>
       <div className="review-stars">
    ★★★★★
  </div>
      <p>
        “I’ve tried many places, but nothing comes close to this. well cooked, the masala is bold, and the rice is perfectly infused with flavor. Once you taste SGS Gundu Palav, there’s no going back.”
      </p>
      
    </div>

    <div className="review-card">
      <img src="/menu/customer2.jpg" alt="Customer" />
      <h4>— Rahul P.</h4>
      <div className="review-stars">★★★★☆ </div>

      <p>
        “Visited SGS Non Veg Gundu Palav following strong recommendations. The place was very much crowded, speaking to its popularity. Absolutely love the Donne style serving. Rich flavors and great quality.”
      </p>
      
    </div>

    <div className="review-card">
      <img src="/menu/customer4.png" alt="Customer" />
      <h4>— Monica Raghu.</h4>
      <div className="review-stars">
    ★★★★★
  </div>
      <p>
        “Chicken Kshatriya is an absolute must-try! Spicy, fresh, and packed with rich masala flavor. The chicken is tender, well-cooked, and perfectly balanced with heat and aroma.”
      </p>
      
    </div>

    <div className="review-card">
      <img src="/menu/customer3..png" alt="Customer" />
      <h4>— Priya R.</h4>
      <div className="review-stars">★★★★☆ </div>
      <p>
       “Traditional taste that truly reminds me of home. The flavors feel authentic and comforting, just like a home-cooked meal. Highly recommended for anyone who loves real South Indian food.”
      </p>
      
    </div>
  </div>
</section>



    {/* ================= FOOTER ================= */}

<footer id="contact" className="home-footer">

  <div className="footer-container">

    {/* Contact */}
    <div className="footer-column">
      <h3>CONTACT US</h3>
      <p>📞 +91 98765 43210</p>
      <p>📍 Balepet, Bengaluru, Karnataka</p>
      <p>✉️ info@sgspalav.com</p>
      <p>🕒 Mon–Fri: 10AM – 9:30PM</p>
    </div>

    {/* About */}
    <div className="footer-column">
      <h3>ABOUT US</h3>
      <p>Our Story</p>
      <p>Our Speciality</p>
      <p>Careers</p>
      <p>Press</p>
    </div>

    {/* Offers */}
    {/* <div className="footer-column">
      <h3>OUR OFFERS</h3>
      <p>Online Delivery</p>
      <p>Special Combos</p>
      <p>Weekend Offers</p>
      <p>Gift Vouchers</p>
    </div> */}

    {/* Delivery Info */}
    <div className="footer-column">
      <h3>DELIVERY INFO</h3>
      <p>Swiggy</p>
      <p>Zomato</p>
      <p>Returns Policy</p>
      <p>Privacy Policy</p>
    </div>

    {/* Social Media Section */}
<div className="footer-column footer-column footer-social">
  <h3>FOLLOW US</h3>

  <div className="social-icons-footer">
    <a href="https://facebook.com" target="_blank" rel="noreferrer">
      <FaFacebookF />
    </a>

    <a href="https://instagram.com" target="_blank" rel="noreferrer">
      <FaInstagram />
    </a>

    <a href="https://whatsapp.com" target="_blank" rel="noreferrer">
      <FaWhatsapp />
    </a>

  </div>
</div>

    
      {/* MAP SECTION */}
      <div
        className="footer-map"
        onClick={() => window.open("https://maps.app.goo.gl/Jhve4bt3t5fJhqaA9?g_st=aw", "_blank")}
        style={{ cursor: "pointer" }}
      >
        <iframe className="map"
          title="SGS Location"
          src="https://www.google.com/maps?q=Sowrastrapet+Circle,+Bengaluru&output=embed"
          width="100%"
          height="260"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
        ></iframe>
      </div>
  </div>

       
      
  <div className="footer-bottom">
    © {new Date().getFullYear()} SGS Nonveg Gundu Palav | All Rights Reserved
  </div>

</footer>


    </div>
  );
}
