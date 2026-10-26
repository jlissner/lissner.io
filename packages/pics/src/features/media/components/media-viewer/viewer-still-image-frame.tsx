import type { ReactNode } from "react";

interface ViewerStillImageFrameProps {
  children: ReactNode;
  faceOverlay?: ReactNode;
}

export function ViewerStillImageFrame({
  children,
  faceOverlay,
}: ViewerStillImageFrameProps) {
  return (
    <div className="viewer-content__image-wrap">
      <div className="viewer-content__image-inner">
        {faceOverlay ? (
          <div className="viewer-content__face-wrap">
            {children}
            {faceOverlay}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
