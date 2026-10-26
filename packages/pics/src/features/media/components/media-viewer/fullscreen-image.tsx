import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  clampScrollOffset,
  normalizedClickAnchor,
  type NormalizedAnchor,
} from "./fullscreen-scroll";
import type { FaceBox } from "./media-viewer-types";

function pct(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

interface FullscreenImageProps {
  src: string;
  alt: string;
  onClose: () => void;
  faceBox?: FaceBox | null;
}

function scrollNativeViewToAnchor(
  container: HTMLDivElement,
  img: HTMLImageElement,
  anchor: NormalizedAnchor,
): void {
  const apply = (): void => {
    container.scrollLeft = clampScrollOffset(
      anchor.x,
      img.offsetWidth,
      container.clientWidth,
    );
    container.scrollTop = clampScrollOffset(
      anchor.y,
      img.offsetHeight,
      container.clientHeight,
    );
  };

  if (img.complete && img.naturalWidth > 0) {
    apply();
    return;
  }

  const onLoad = (): void => {
    img.removeEventListener("load", onLoad);
    apply();
  };
  img.addEventListener("load", onLoad);
}

export function FullscreenImage({
  src,
  alt,
  onClose,
  faceBox,
}: FullscreenImageProps) {
  const [nativeSize, setNativeSize] = useState(false);
  const [showBox, setShowBox] = useState(!!faceBox);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pendingAnchorRef = useRef<NormalizedAnchor | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!nativeSize || pendingAnchorRef.current == null) {
      return;
    }
    const container = containerRef.current;
    const img = imgRef.current;
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (!container || !img) {
      return;
    }
    scrollNativeViewToAnchor(container, img, anchor);
  }, [nativeSize, src]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      e.stopPropagation();
      if (nativeSize) {
        setNativeSize(false);
        return;
      }
      pendingAnchorRef.current = normalizedClickAnchor(
        e.clientX,
        e.clientY,
        e.currentTarget.getBoundingClientRect(),
      );
      setNativeSize(true);
    },
    [nativeSize],
  );

  const img = (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={
        nativeSize
          ? "fullscreen-zoom__img fullscreen-zoom__img--native"
          : "fullscreen-zoom__img fullscreen-zoom__img--constrained"
      }
      onClick={handleImageClick}
      draggable={false}
    />
  );

  return (
    <div
      ref={containerRef}
      className={
        nativeSize
          ? "fullscreen-zoom fullscreen-zoom--native"
          : "fullscreen-zoom fullscreen-zoom--constrained"
      }
    >
      {faceBox && showBox && !nativeSize
        ? (() => {
            const nw = imgRef.current?.naturalWidth || 1;
            const nh = imgRef.current?.naturalHeight || 1;
            return (
              <div
                style={{
                  position: "relative",
                  maxWidth: "100%",
                  maxHeight: "100%",
                  lineHeight: 0,
                }}
              >
                {img}
                <div
                  style={{
                    position: "absolute",
                    left: pct(faceBox.x, nw),
                    top: pct(faceBox.y, nh),
                    width: pct(faceBox.width, nw),
                    height: pct(faceBox.height, nh),
                    border: "2px solid #f59e0b",
                    borderRadius: 4,
                    pointerEvents: "none",
                  }}
                />
              </div>
            );
          })()
        : img}
      {faceBox && (
        <button
          type="button"
          className="fullscreen-zoom__close"
          style={{ right: 56 }}
          onClick={(e) => {
            e.stopPropagation();
            setShowBox((v) => !v);
          }}
          aria-label={showBox ? "Hide face border" : "Show face border"}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={showBox ? "#f59e0b" : "currentColor"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 20c0-3 2.5-5 5-5s5 2 5 5" />
          </svg>
        </button>
      )}
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
