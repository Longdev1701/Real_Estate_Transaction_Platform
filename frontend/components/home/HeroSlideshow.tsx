"use client";

import { useEffect, useState } from "react";

const slideshowImages = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=compress&cs=tinysrgb&w=1920",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=compress&cs=tinysrgb&w=1920",
  "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=compress&cs=tinysrgb&w=1920",
];

export function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slideshowImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {slideshowImages.map((imageUrl, index) => (
        <div
          key={imageUrl}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
          style={{
            backgroundImage: `url(${imageUrl})`,
            transform: index === currentIndex ? "scale(1.08)" : "scale(1)",
            transition: "opacity 1500ms ease-in-out, transform 6500ms ease-out",
          }}
        />
      ))}
    </div>
  );
}
