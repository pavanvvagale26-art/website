import React, { useContext } from "react";
import { GalleryContext } from "../context/GalleryContext";
import "../App.css";

export default function Gallery() {
  const { gallery } = useContext(GalleryContext);

  return (
    <div className="gallery-wrapper">
      <div className="gallery-hero">
        <h1>SGS Gallery</h1>
        <p>Explore our authentic dishes through curated moments from our restaurant.</p>
      </div>

      {/* ===== IMAGE GRID (CENTER SECTION) ===== */}
      <div className="gallery-grid-container">
        <div className="gallery-grid">
          {gallery.map((img) => (
            <img key={img.id} src={img.src} alt={img.caption || "Food"} />
          ))}
        </div>
      </div>

      
    </div>
  );
}
