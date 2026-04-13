"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { PastEventsImage } from "@/core/types/site-content";

interface ImageCarouselProps {
  images: PastEventsImage[];
  autoPlayMs?: number;
}

export function ImageCarousel({ images, autoPlayMs = 4000 }: ImageCarouselProps) {
  const t = useTranslations("landing");
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const prev = useCallback(() => setCurrent((c) => (c - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent((c) => (c + 1) % images.length), [images.length]);

  useEffect(() => {
    if (paused || images.length <= 1) return;
    const id = setInterval(next, autoPlayMs);
    return () => clearInterval(id);
  }, [paused, next, autoPlayMs, images.length]);

  if (images.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-gray-800/60 bg-[#0d1017]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Main image */}
      <div className="relative aspect-[16/7] w-full">
        {images.map((img, i) => (
          <div
            key={img.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <img
              src={img.url}
              alt={img.caption ?? t("eventPhotoAlt", { index: i + 1 })}
              className="h-full w-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {img.caption && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="rounded-full bg-black/50 px-4 py-1 text-xs font-bold text-gray-200 backdrop-blur-sm">
                  {img.caption}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-purple-600/70"
            aria-label={t("previousImage")}
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-purple-600/70"
            aria-label={t("nextImage")}
          >
            ›
          </button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-6 bg-purple-500" : "w-1.5 bg-gray-600 hover:bg-gray-400"
              }`}
              aria-label={t("goToImageSlide", { index: i + 1 })}
            />
          ))}
        </div>
      )}

      {/* Counter badge */}
      <div className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-gray-300 backdrop-blur-sm">
        {current + 1} / {images.length}
      </div>
    </div>
  );
}
