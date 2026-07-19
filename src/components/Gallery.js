import React from "react";
import "../App.css";

export default function Gallery() {
  return (
    <div className="gallery-wrapper">
      <div className="gallery-hero">
        <h1>SGS Gallery</h1>
        <p>Explore our authentic dishes through curated moments from our restaurant.</p>
      </div>

      {/* ===== IMAGE GRID (CENTER SECTION) ===== */}
      <div className="gallery-grid-container">
        <div className="gallery-grid">
          <img src="/gallery/img1.jpg" alt="Food" />
          <img src="/gallery/img2.jpg" alt="Food" />
          <img src="/gallery/img3.jpg" alt="Food" />
          <img src="/gallery/img4.jpg" alt="Food" />
          <img src="/gallery/img5.jpg" alt="Food" />
          <img src="/gallery/img6.jpg" alt="Food" />
          <img src="/gallery/img7.jpg" alt="Food" />
          <img src="/gallery/img8.jpg" alt="Food" />
          <img src="/gallery/img9.jpg" alt="Food" />
          <img src="/gallery/img10.jpg" alt="Food" />
          <img src="/gallery/img11.jpg" alt="Food" />
          <img src="/gallery/img12.jpg" alt="Food" />
          <img src="/gallery/img13.jpg" alt="Food" />
          <img src="/gallery/img14.jpg" alt="Food" />
          <img src="/gallery/img15.jpg" alt="Food" />
          <img src="/gallery/img16.jpg" alt="Food" />
        </div>
      </div>

      
    </div>
  );
}
