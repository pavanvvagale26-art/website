import React, { useContext } from "react";
import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";
import { ReviewContext } from "../context/ReviewContext";
import "../App.css";

export default function AllReviews() {
  const { reviews, averageRating, totalReviews, ratingDistribution } =
    useContext(ReviewContext);

  // Render filled/half/empty stars for a given rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars.push(<FaStar key={i} className="star-filled" />);
      } else if (i - 0.5 <= rating) {
        stars.push(<FaStarHalfAlt key={i} className="star-filled" />);
      } else {
        stars.push(<FaRegStar key={i} className="star-empty" />);
      }
    }
    return stars;
  };

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "?");

  // Format date nicely
  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="all-reviews-wrapper">
      {/* Hero Banner */}
      <div className="all-reviews-hero">
        <h1>Customer Reviews</h1>
        <p>
          Hear what our customers have to say about their experience at SGS
          Nonveg Gundu Palav.
        </p>
      </div>

      {/* Summary Stats Card */}
      <div className="reviews-summary-section">
        <div className="reviews-summary-card">
          <div className="summary-left">
            <div className="summary-big-rating">{averageRating}</div>
            <div className="summary-stars">{renderStars(parseFloat(averageRating))}</div>
            <div className="summary-count">Based on {totalReviews} reviews</div>
          </div>
          <div className="summary-right">
            {ratingDistribution.map((dist) => (
              <div key={dist.star} className="dist-row">
                <span className="dist-label">{dist.star} ★</span>
                <div className="dist-bar-track">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${dist.percentage}%` }}
                  ></div>
                </div>
                <span className="dist-count">{dist.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Reviews Grid */}
      <div className="all-reviews-grid-container">
        <div className="all-reviews-grid">
          {reviews.map((review) => (
            <div key={review.id} className="all-review-card">
              <div className="all-review-card-top">
                {review.avatar ? (
                  <img
                    src={review.avatar}
                    alt={review.name}
                    className="all-review-avatar-img"
                  />
                ) : (
                  <div className="all-review-avatar-initial">
                    {getInitial(review.name)}
                  </div>
                )}
                <div className="all-review-meta">
                  <h4>{review.name}</h4>
                  <div className="all-review-stars">
                    {renderStars(review.rating)}
                  </div>
                  <span className="all-review-date">
                    {formatDate(review.date)}
                  </span>
                </div>
              </div>
              <p className="all-review-text">"{review.text}"</p>
            </div>
          ))}
        </div>

        {reviews.length === 0 && (
          <div className="no-reviews-msg">
            <FaRegStar className="no-reviews-icon" />
            <p>No reviews yet. Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </div>
  );
}
