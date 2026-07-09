import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceBox } from "./media-viewer-types";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

interface ResizableFaceBoxProps {
  box: FaceBox;
  imgRef: React.RefObject<HTMLImageElement | null>;
  onBoxChange: (box: FaceBox) => void;
  children?: React.ReactNode;
}

const HANDLE_SIZE = 12;
const MIN_NAT = 20;

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

function pct(value: number, total: number): string {
  return `${(value / total) * 100}%`;
}

export function ResizableFaceBox({
  box,
  imgRef,
  onBoxChange,
  children,
}: ResizableFaceBoxProps) {
  const [dragging, setDragging] = useState<Handle | null>(null);
  const startRef = useRef<{
    mx: number;
    my: number;
    box: FaceBox;
  } | null>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !startRef.current || !imgRef.current) return;
      const img = imgRef.current;
      const rect = img.getBoundingClientRect();
      const toNatX = img.naturalWidth / rect.width;
      const toNatY = img.naturalHeight / rect.height;
      const dx = (e.clientX - startRef.current.mx) * toNatX;
      const dy = (e.clientY - startRef.current.my) * toNatY;
      const s = startRef.current.box;

      let x = s.x;
      let y = s.y;
      let w = s.width;
      let h = s.height;

      if (dragging === "move") {
        x = Math.max(0, Math.min(img.naturalWidth - w, x + dx));
        y = Math.max(0, Math.min(img.naturalHeight - h, y + dy));
      } else {
        if (dragging.includes("e")) w = Math.max(MIN_NAT, w + dx);
        if (dragging.includes("w")) {
          const nx = x + dx;
          if (nx >= 0) {
            x = nx;
            w = Math.max(MIN_NAT, w - dx);
          }
        }
        if (dragging.includes("s")) h = Math.max(MIN_NAT, h + dy);
        if (dragging.includes("n")) {
          const ny = y + dy;
          if (ny >= 0) {
            y = ny;
            h = Math.max(MIN_NAT, h - dy);
          }
        }
      }

      onBoxChange({ x, y, width: w, height: h });
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
      startRef.current = { mx: e.clientX, my: e.clientY, box: { ...box } };
    },
    [box],
  );

  const nw = imgRef.current?.naturalWidth || 1;
  const nh = imgRef.current?.naturalHeight || 1;

  return (
    <>
      {children}
      <div
        onMouseDown={(e) => handleMouseDown(e, "move")}
        style={{
          position: "absolute",
          left: pct(box.x, nw),
          top: pct(box.y, nh),
          width: pct(box.width, nw),
          height: pct(box.height, nh),
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
