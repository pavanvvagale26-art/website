import React, { useContext, useState } from "react";
import "../App.css";
import { FaFacebookF, FaInstagram, FaWhatsapp, FaStar, FaTimes, FaPen } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { ReviewContext } from "../context/ReviewContext";
import { GalleryContext } from "../context/GalleryContext";




export default function Home() {
  const navigate = useNavigate();
  const { user, setShowCustomerAuthModal } = useContext(AuthContext);
  const { reviews, addReview, averageRating, totalReviews } = useContext(ReviewContext);
  const { gallery } = useContext(GalleryContext);

  // Review form state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const goTo = (path) => {
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
    navigate(path);
  };

  const handleOrderNow = () => {
    if (!user) {
      setShowCustomerAuthModal(true);
      return;
    }
    goTo("/menu");
  };

  const handleWriteReview = () => {
    if (!user) {
      setShowCustomerAuthModal(true);
      return;
    }
    setShowReviewModal(true);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (reviewRating === 0) {
      alert("Please select a star rating.");
      return;
    }
    if (!reviewText.trim()) {
      alert("Please write your review.");
      return;
    }
    addReview({
      name: user.name || "Customer",
      rating: reviewRating,
      text: reviewText.trim(),
      avatar: null, // Will use initial-based avatar
    });
    setReviewRating(0);
    setReviewHover(0);
    setReviewText("");
    setReviewSuccess(true);
    setTimeout(() => {
      setReviewSuccess(false);
      setShowReviewModal(false);
    }, 1500);
  };

  // Render star rating display
  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rating ? "#f4c430" : "#d1d5db" }}>★</span>
    ));
  };

  // Get user initial for avatar
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  // Show latest 3 reviews on home page (plus 1 write-review card at the end = 4 items in 1 row)
  const latestReviews = reviews.slice(0, 3);

  // Show first 5 gallery images on home page
  const previewGallery = gallery.slice(0, 5);

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
          <button className="btn-red" onClick={handleOrderNow}>Order Now</button>
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
          {previewGallery.map((img) => (
            <img key={img.id} src={img.src} alt={img.caption || "Gallery"} />
          ))}
        </div>
          <button className="btn3-red" onClick={() => goTo("/gallery")}>View More</button>
      </section>


      {/* ===== REVIEWS SECTION ===== */}
<section className="section review-section" id="reviews">
  <h1 className="section-title">CUSTOMER <span>REVIEWS</span></h1>
  <p className="review-subtitle">
    Rated <strong>{averageRating}</strong> ★ by <strong>{totalReviews}</strong> happy customers
  </p>

  <div className="review-grid">
    {/* Dynamic Review Cards */}
    {latestReviews.map((review) => (
      <div key={review.id} className="review-card">
        {review.avatar ? (
          <img src={review.avatar} alt={review.name} />
        ) : (
          <div className="review-avatar-initial">
            {getInitial(review.name)}
          </div>
        )}
        <h4>— {review.name}</h4>
        <div className="review-stars">
          {renderStars(review.rating)}
        </div>
        <p>"{review.text}"</p>
      </div>
    ))}

    {/* Write a Review Card (at the last position) */}
    <div className="review-card write-review-card" onClick={handleWriteReview}>
      <div className="write-review-icon">
        <FaPen />
      </div>
      <h4>Write a Review</h4>
      <p>Share your experience with us!</p>
      <button className="write-review-btn">Rate & Review</button>
    </div>
  </div>

  {/* View All Button */}
  <button className="btn-view-all-reviews" onClick={() => goTo("/reviews")}>
    View All Reviews →
  </button>
</section>

      {/* ===== REVIEW MODAL ===== */}
      {showReviewModal && (
        <div className="review-modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <h2><FaStar /> Write Your Review</h2>
              <button className="review-modal-close" onClick={() => setShowReviewModal(false)}>
                <FaTimes />
              </button>
            </div>
            <form onSubmit={handleSubmitReview} className="review-form">
              <div className="review-form-rating">
                <label>Your Rating</label>
                <div className="star-selector">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={`star-select ${star <= (reviewHover || reviewRating) ? "star-active" : "star-inactive"}`}
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setReviewHover(star)}
                      onMouseLeave={() => setReviewHover(0)}
                    />
                  ))}
                  <span className="rating-label">
                    {reviewRating === 1 && "Poor"}
                    {reviewRating === 2 && "Fair"}
                    {reviewRating === 3 && "Good"}
                    {reviewRating === 4 && "Very Good"}
                    {reviewRating === 5 && "Excellent"}
                  </span>
                </div>
              </div>
              <div className="review-form-text">
                <label>Your Review</label>
                <textarea
                  placeholder="Tell us about your experience at SGS Gundu Palav..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows="4"
                  maxLength={500}
                />
                <small>{reviewText.length}/500 characters</small>
              </div>
              <button type="submit" className="review-submit-btn">
                Submit Review
              </button>
              {reviewSuccess && (
                <div className="review-success-msg">
                  ✅ Review submitted successfully!
                </div>
              )}
            </form>
          </div>
        </div>
      )}


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
