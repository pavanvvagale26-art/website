import React from "react";
import "../App.css";

export default function About() {
  return (
    <div className="about-page">

      {/* ===== TOP SPLIT SECTION (Like your reference image) ===== */}
      <div className="about-split">
        <div className="about-image">
          <img src="/about-bg.jpg" alt="Gundu Palav" />
        </div>

        <div className="about-text">
          <h1><span>SGS Gundu Palav</span> </h1>


          <p>
            SGS Nonveg Gundu Palav is a hidden culinary gem known more by word of mouth than by maps. Though it may appear on GPS, locals know exactly where to guide you — and some may even walk you to the spot themselves.
            SGS has always focused on food over frills. It has elaborate interiors and seating arrangements for savoring the rich flavors that have made this place iconic. The experience is simple, authentic, and rooted in tradition.</p>
          <p>Established in 1992 by Late Gundu Munishwara, the restaurant began as a humble venture built on passion and dedication to authentic South Indian flavors. Today, it is proudly run by his four sons — Vishwanath, Ramesh, Keshav, and Mahindra — who continue to uphold their father’s legacy with the same commitment to quality and taste.
            Interestingly, what was once simply called “biryani” became popularly known as “donne biryani” after customers began specifically asking for it served in the traditional leaf bowl (donne). Embracing this identity, the establishment evolved while staying true to its roots.
            Opening as early as 8:30 AM, SGS serves approximately 300 customers daily — with numbers rising significantly on busy days. Apart from their signature Gundu Palav, favorites like Kebab and the special Kshatriya chicken dish have earned loyal followers over the years.
            Closed on Mondays and Saturdays, and bustling on Sundays, SGS remains one of Bengaluru’s most beloved spots for authentic, no-compromise South Indian flavors.
          </p>
          {/* <button className="about-btn">ORDER NOW</button> */}
        </div>


      </div>

      {/* ===== BOTTOM SECTION (Like "What's in the box") ===== */}
      <div className="about-features">
        <h2>What’s in the Plate</h2>

        <div className="feature-grid">
          <div className="feature-card">
            <h3>Premium Portions</h3>
            <p>
              Generous servings made with high-quality ingredients, ensuring
              every bite is flavorful and satisfying.
            </p>
          </div>

          <div className="feature-card">
            <h3>Fresh Packing</h3>
            <p>
              Hygienic banana leaf-style packaging to retain aroma, warmth,
              and authentic presentation.
            </p>
          </div>

          <div className="feature-card">
            <h3>Chef Curated</h3>
            <p>
              Recipes perfected by experienced cooks using traditional
              South Indian cooking methods.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
