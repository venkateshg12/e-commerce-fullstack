import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HomeBanner } from "@/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const AUTOPLAY_MS = 5000;
// How far a finger has to travel before a touch counts as a swipe rather than a tap.
const SWIPE_THRESHOLD_PX = 50;

type HomeHeroProps = {
  banners: HomeBanner[];
  // Guests get a "Create account" call to action in the fallback hero; customers don't.
  isSignedIn: boolean;
};

const HomeHero = ({ banners, isSignedIn }: HomeHeroProps) => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Read once: people who ask the OS for less motion don't get an auto-advancing slider.
  const [prefersReducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
  const pointerStartX = useRef<number | null>(null);
  // Set when the last pointer gesture was a swipe, so the click that ends it doesn't also follow
  // the banner's link.
  const didSwipe = useRef(false);

  const slideCount = banners.length;
  // Clamped by derivation, so a banner deleted while this page is open can't strand the slider
  // on an empty slot.
  const activeIndex = slideCount ? Math.min(index, slideCount - 1) : 0;

  // Auto-advance. `activeIndex` is a dependency on purpose: a manual click restarts the
  // countdown, so the slide the user just picked isn't swapped out a moment later.
  useEffect(() => {
    if (isPaused || slideCount < 2 || prefersReducedMotion) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % slideCount),
      AUTOPLAY_MS
    );
    return () => clearInterval(timer);
  }, [isPaused, slideCount, prefersReducedMotion, activeIndex]);

  // No banners uploaded (or the feed failed) — show a text hero rather than an empty box.
  if (slideCount === 0) {
    return (
      <div className="home-hero-fallback-wrap">
        <section className="home-hero-fallback">
          <h1 className="home-hero-title">Discover products you'll love</h1>
          <p className="home-hero-subtitle">
            The latest styles, honest prices and exclusive offers — all in one place.
          </p>
          <div className="home-hero-actions">
            <Button asChild className="home-hero-button">
              <Link to="/collections">Shop now</Link>
            </Button>
            {!isSignedIn ? (
              <Button asChild variant="outline" className="home-hero-button">
                <Link to="/register">Create account</Link>
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  const goTo = (next: number) => setIndex((next + slideCount) % slideCount);

  return (
    <section
      className="home-carousel"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onPointerDown={(event) => {
        pointerStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStartX.current === null) return;
        const deltaX = event.clientX - pointerStartX.current;
        pointerStartX.current = null;
        didSwipe.current = Math.abs(deltaX) >= SWIPE_THRESHOLD_PX;
        if (!didSwipe.current) return;
        goTo(deltaX < 0 ? activeIndex + 1 : activeIndex - 1);
      }}
      onClickCapture={(event) => {
        if (!didSwipe.current) return;
        didSwipe.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {/* Every slide sits side by side in one row; the row slides left by one full width per step. */}
      <div
        className="home-carousel-track"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {banners.map((banner, slideIndex) => (
          <Link
            key={banner._id}
            to="/collections"
            className="home-carousel-slide"
            aria-roledescription="slide"
            aria-label={`Slide ${slideIndex + 1} of ${slideCount}`}
            aria-hidden={slideIndex !== activeIndex}
            // Off-screen slides stay out of the tab order.
            tabIndex={slideIndex === activeIndex ? 0 : -1}
            // Stops the browser's native link-drag from hijacking a mouse swipe.
            draggable={false}
          >
            <img
              src={banner.imageUrl}
              alt="Featured collection"
              className="home-carousel-image"
              draggable={false}
              // The first slide is the first thing on screen; the rest can wait.
              {...(slideIndex === 0 ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
            />
          </Link>
        ))}
      </div>

      {slideCount > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            className="home-carousel-arrow left-3 sm:left-5"
            onClick={() => goTo(activeIndex - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next banner"
            className="home-carousel-arrow right-3 sm:right-5"
            onClick={() => goTo(activeIndex + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="home-carousel-dots">
            {banners.map((banner, dotIndex) => (
              <button
                key={banner._id}
                type="button"
                aria-label={`Go to banner ${dotIndex + 1}`}
                aria-current={dotIndex === activeIndex}
                className={cn(
                  "home-carousel-dot",
                  dotIndex === activeIndex && "home-carousel-dot-active"
                )}
                onClick={() => goTo(dotIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
};

export default HomeHero;
