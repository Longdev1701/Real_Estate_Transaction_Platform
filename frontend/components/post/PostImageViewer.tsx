"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PostImage {
  id: string;
  imageUrl: string;
}

interface PostImageViewerProps {
  isOpen: boolean;
  images: PostImage[];
  selectedImageIndex: number;
  postTitle: string;
  onClose: () => void;
  onImageChange: (index: number) => void;
}

export function PostImageViewer({
  isOpen,
  images,
  selectedImageIndex,
  postTitle,
  onClose,
  onImageChange,
}: PostImageViewerProps) {
  const activeImage = images[selectedImageIndex]?.imageUrl;

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && images.length > 1) {
        onImageChange(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1);
      } else if (e.key === "ArrowRight" && images.length > 1) {
        onImageChange(selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, images.length, selectedImageIndex, onClose, onImageChange]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="theme-media-backdrop fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-md"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="theme-media-control absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full transition"
            aria-label="Đóng ảnh"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageChange(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1);
                }}
                className="theme-media-control absolute left-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition"
                aria-label="Ảnh trước"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onImageChange(selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1);
                }}
                className="theme-media-control absolute right-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition"
                aria-label="Ảnh tiếp theo"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="flex max-h-[96vh] w-full max-w-[min(96vw,1800px)] flex-col items-center gap-4 px-6 pt-6 md:px-12 md:pt-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex flex-1 items-center justify-center overflow-hidden w-full">
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImageIndex}
                  src={activeImage}
                  alt={postTitle}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                  className="max-h-[76vh] md:max-h-[84vh] max-w-full rounded-xl object-contain shadow-2xl"
                />
              </AnimatePresence>
            </div>
            <div className="theme-count-pill rounded-full px-4 py-1.5 text-sm font-medium">
              {selectedImageIndex + 1} / {images.length}
            </div>
            {images.length > 1 && (
              <div className="scrollbar-hidden flex max-w-full gap-2 overflow-x-auto py-1">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImageChange(index);
                    }}
                    className={`h-12 w-20 shrink-0 overflow-hidden rounded-lg border transition-all ${
                      selectedImageIndex === index
                        ? "border-[var(--accent)] scale-105 opacity-100 shadow-md"
                        : "border-[var(--media-badge-border)] opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={image.imageUrl} alt={`${postTitle} ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
