import { useState, type CSSProperties, type MouseEvent, type Ref } from "react";

/**
 * `.mp` Pixel files may be JPEG or MP4; DB MIME can be wrong until the server sniffs bytes.
 * Try `<img>` first, then `<video>` if decoding fails.
 */
export function PixelMpOrImageVideoPreview({
  src,
  alt,
  className,
  imgStyle,
  videoStyle,
  imgRef,
  imgClassName,
  onImgClick,
  onImgDoubleClick,
  onSwitchToVideo,
}: {
  src: string;
  alt: string;
  className?: string;
  imgStyle?: CSSProperties;
  videoStyle?: CSSProperties;
  imgRef?: Ref<HTMLImageElement>;
  imgClassName?: string;
  onImgClick?: (e: MouseEvent<HTMLImageElement>) => void;
  onImgDoubleClick?: (e: MouseEvent<HTMLImageElement>) => void;
  onSwitchToVideo?: () => void;
}) {
  const [useVideo, setUseVideo] = useState(false);
  if (useVideo) {
    return (
      <video
        src={src}
        controls
        className={className ?? imgClassName}
        style={videoStyle ?? imgStyle}
        aria-label={alt}
      />
    );
  }
  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={imgClassName ?? className}
      style={imgStyle}
      onClick={onImgClick}
      onDoubleClick={onImgDoubleClick}
      onError={() => {
        setUseVideo(true);
        onSwitchToVideo?.();
      }}
    />
  );
}
