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

interface FullscreenImageProps {
  src: string;
  alt: string;
  onClose: () => void;
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

export function FullscreenImage({ src, alt, onClose }: FullscreenImageProps) {
  const [nativeSize, setNativeSize] = useState(false);
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

  return (
    <div
      ref={containerRef}
      className={
        nativeSize
          ? "fullscreen-zoom fullscreen-zoom--native"
          : "fullscreen-zoom fullscreen-zoom--constrained"
      }
    >
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
