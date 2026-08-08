import React, { createContext, useState, useEffect } from "react";

export const GalleryContext = createContext();

// Pre-seeded with existing gallery images from public/gallery/
const initialGallery = Array.from({ length: 16 }, (_, i) => ({
  id: `g${i + 1}`,
  src: `/gallery/img${i + 1}.jpg`,
  caption: "",
  dateAdded: "2025-01-01",
}));

export function GalleryProvider({ children }) {
  const [gallery, setGallery] = useState(() => {
    const saved = localStorage.getItem("sgs_gallery");
    if (saved) {
      return JSON.parse(saved);
    }
    return initialGallery;
  });

  useEffect(() => {
    localStorage.setItem("sgs_gallery", JSON.stringify(gallery));
  }, [gallery]);

  const addImage = (image) => {
    const newImage = {
      ...image,
      id: `g-${Date.now()}`,
      dateAdded: new Date().toISOString().split("T")[0],
    };
    setGallery((prev) => [...prev, newImage]);
  };

  const removeImage = (id) => {
    setGallery((prev) => prev.filter((img) => img.id !== id));
  };

  return (
    <GalleryContext.Provider value={{ gallery, addImage, removeImage }}>
      {children}
    </GalleryContext.Provider>
  );
}
