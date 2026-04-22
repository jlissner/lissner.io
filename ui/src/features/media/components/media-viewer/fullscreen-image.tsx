import { useCallback, useEffect, useRef, useState } from "react";

interface FullscreenImageProps {
  src: string;
  alt: string;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function FullscreenImage({ src, alt, onClose }: FullscreenImageProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const panRef = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const getPinchDist = (touches: React.TouchList): number => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = { dist: getPinchDist(e.touches), scale };
        panRef.current = null;
      } else if (e.touches.length === 1 && scale > 1) {
        const t = e.touches[0];
        panRef.current = {
          x: t.clientX,
          y: t.clientY,
          tx: translate.x,
          ty: translate.y,
        };
        pinchRef.current = null;
      }
    },
    [scale, translate],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        const dist = getPinchDist(e.touches);
        const ratio = dist / pinchRef.current.dist;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, pinchRef.current.scale * ratio),
        );
        setScale(newScale);
        if (newScale <= 1) setTranslate({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && panRef.current && scale > 1) {
        const t = e.touches[0];
        const dx = t.clientX - panRef.current.x;
        const dy = t.clientY - panRef.current.y;
        setTranslate({ x: panRef.current.tx + dx, y: panRef.current.ty + dy });
      }
    },
    [scale],
  );

  const onTouchEnd = useCallback(() => {
    pinchRef.current = null;
    panRef.current = null;
    if (scale <= 1) {
      resetTransform();
    }
  }, [scale, resetTransform]);

  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2.5);
    }
  }, [scale, resetTransform]);

  const doubleTapRef = useRef<{ time: number; x: number; y: number } | null>(
    null,
  );

  const handleTap = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 0) return;
      const t = e.changedTouches[0];
      const now = Date.now();
      const prev = doubleTapRef.current;

      if (
        prev &&
        now - prev.time < 300 &&
        Math.abs(t.clientX - prev.x) < 30 &&
        Math.abs(t.clientY - prev.y) < 30
      ) {
        doubleTapRef.current = null;
        handleDoubleTap();
        return;
      }

      doubleTapRef.current = { time: now, x: t.clientX, y: t.clientY };

      if (scale <= 1) {
        setTimeout(() => {
          if (
            doubleTapRef.current &&
            Date.now() - doubleTapRef.current.time >= 280
          ) {
            onClose();
          }
        }, 300);
      }
    },
    [scale, handleDoubleTap, onClose],
  );

  return (
    <div
      ref={containerRef}
      className="fullscreen-zoom"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={(e) => {
        onTouchEnd();
        handleTap(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (scale <= 1) onClose();
      }}
    >
      <img
        src={src}
        alt={alt}
        className="fullscreen-zoom__img"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
        }}
        draggable={false}
      />
      <button
        type="button"
        className="fullscreen-zoom__close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Exit fullscreen"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
