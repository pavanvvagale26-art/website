import React, { createContext, useState, useEffect } from "react";

export const ReviewContext = createContext();

// Pre-seeded reviews matching the original hardcoded ones
const initialReviews = [
  {
    id: "r1",
    name: "Pavan V.",
    rating: 5,
    text: "I've tried many places, but nothing comes close to this. Well cooked, the masala is bold, and the rice is perfectly infused with flavor. Once you taste SGS Gundu Palav, there's no going back.",
    date: "2025-12-10",
    avatar: "/menu/customer.jpg",
  },
  {
    id: "r2",
    name: "Rahul P.",
    rating: 4,
    text: "Visited SGS Non Veg Gundu Palav following strong recommendations. The place was very much crowded, speaking to its popularity. Absolutely love the Donne style serving. Rich flavors and great quality.",
    date: "2026-01-15",
    avatar: "/menu/customer2.jpg",
  },
  {
    id: "r3",
    name: "Monica Raghu.",
    rating: 5,
    text: "Chicken Kshatriya is an absolute must-try! Spicy, fresh, and packed with rich masala flavor. The chicken is tender, well-cooked, and perfectly balanced with heat and aroma.",
    date: "2026-02-22",
    avatar: "/menu/customer4.png",
  },
  {
    id: "r4",
    name: "Priya R.",
    rating: 4,
    text: "Traditional taste that truly reminds me of home. The flavors feel authentic and comforting, just like a home-cooked meal. Highly recommended for anyone who loves real South Indian food.",
    date: "2026-03-05",
    avatar: "/menu/customer3..png",
  },
];

export function ReviewProvider({ children }) {
  const [reviews, setReviews] = useState(() => {
    const saved = localStorage.getItem("sgs_reviews");
    if (saved) {
      return JSON.parse(saved);
    }
    return initialReviews;
  });

  useEffect(() => {
    localStorage.setItem("sgs_reviews", JSON.stringify(reviews));
  }, [reviews]);

  const addReview = (review) => {
    const newReview = {
      ...review,
      id: `r-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
    };
    setReviews((prev) => [newReview, ...prev]);
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage:
      reviews.length > 0
        ? Math.round(
            (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
          )
        : 0,
  }));

  return (
    <ReviewContext.Provider
      value={{
        reviews,
        addReview,
        averageRating,
        ratingDistribution,
        totalReviews: reviews.length,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}
