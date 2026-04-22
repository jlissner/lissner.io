import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FaceBox } from "./media-viewer-types";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

interface ResizableFaceBoxProps {
  box: FaceBox;
  imgRef: React.RefObject<HTMLImageElement | null>;
  onBoxChange: (box: FaceBox) => void;
  children?: React.ReactNode;
}

const HANDLE_SIZE = 12;
const MIN_SIZE = 20;

const HANDLE_STYLES: Array<{
  handle: Handle;
  cursor: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
}> = [
  { handle: "nw", top: "-6px", left: "-6px", cursor: "nwse-resize" },
  { handle: "n", top: "-6px", left: "calc(50% - 6px)", cursor: "ns-resize" },
  { handle: "ne", top: "-6px", right: "-6px", cursor: "nesw-resize" },
  { handle: "e", top: "calc(50% - 6px)", right: "-6px", cursor: "ew-resize" },
  { handle: "se", bottom: "-6px", right: "-6px", cursor: "nwse-resize" },
  { handle: "s", bottom: "-6px", left: "calc(50% - 6px)", cursor: "ns-resize" },
  { handle: "sw", bottom: "-6px", left: "-6px", cursor: "nesw-resize" },
  { handle: "w", top: "calc(50% - 6px)", left: "-6px", cursor: "ew-resize" },
];

export function ResizableFaceBox({
  box,
  imgRef,
  onBoxChange,
  children,
}: ResizableFaceBoxProps) {
  const [dragging, setDragging] = useState<Handle | null>(null);
  const startRef = useRef<{
    x: number;
    y: number;
    boxX: number;
    boxY: number;
    boxW: number;
    boxH: number;
  } | null>(null);

  const scaled = useMemo(() => {
    const img = imgRef.current;
    if (!img) return box;
    const rect = img.getBoundingClientRect();
    return {
      x: box.x * (rect.width / img.naturalWidth),
      y: box.y * (rect.height / img.naturalHeight),
      width: box.width * (rect.width / img.naturalWidth),
      height: box.height * (rect.height / img.naturalHeight),
    };
  }, [imgRef, box]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !startRef.current || !imgRef.current) return;
      const img = imgRef.current;
      const rect = img.getBoundingClientRect();
      const imgScaleX = img.naturalWidth / rect.width;
      const imgScaleY = img.naturalHeight / rect.height;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;

      let x = startRef.current.boxX;
      let y = startRef.current.boxY;
      let w = startRef.current.boxW;
      let h = startRef.current.boxH;

      if (dragging === "move") {
        x = Math.max(0, Math.min(rect.width - w, x + dx));
        y = Math.max(0, Math.min(rect.height - h, y + dy));
      } else {
        if (dragging.includes("e")) w = Math.max(MIN_SIZE, w + dx);
        if (dragging.includes("w")) {
          const nx = x + dx;
          if (nx >= 0) {
            x = nx;
            w = Math.max(MIN_SIZE, w - dx);
          }
        }
        if (dragging.includes("s")) h = Math.max(MIN_SIZE, h + dy);
        if (dragging.includes("n")) {
          const ny = y + dy;
          if (ny >= 0) {
            y = ny;
            h = Math.max(MIN_SIZE, h - dy);
          }
        }
      }

      onBoxChange({
        x: Math.max(0, x * imgScaleX),
        y: Math.max(0, y * imgScaleY),
        width: Math.max(MIN_SIZE * imgScaleX, w * imgScaleX),
        height: Math.max(MIN_SIZE * imgScaleY, h * imgScaleY),
      });
    },
    [dragging, imgRef, onBoxChange],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    startRef.current = null;
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: Handle) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        boxX: scaled.x,
        boxY: scaled.y,
        boxW: scaled.width,
        boxH: scaled.height,
      };
    },
    [scaled],
  );

  return (
    <>
      {children}
      <div
        onMouseDown={(e) => handleMouseDown(e, "move")}
        style={{
          position: "absolute",
          left: scaled.x,
          top: scaled.y,
          width: scaled.width,
          height: scaled.height,
          cursor: dragging === "move" ? "grabbing" : "grab",
          zIndex: 10,
          pointerEvents: "auto",
        }}
      >
        {HANDLE_STYLES.map(({ handle, ...style }) => (
          <div
            key={handle}
            onMouseDown={(e) => handleMouseDown(e, handle)}
            style={{
              position: "absolute",
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor: "white",
              border: "2px solid #f59e0b",
              borderRadius: 2,
              zIndex: 11,
              pointerEvents: "auto",
              ...style,
            }}
          />
        ))}
      </div>
    </>
  );
}
