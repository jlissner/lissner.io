import { useEffect } from "react";

interface UseMediaViewerKeyboardOptions {
  fullscreen: boolean;
  assigningFace: unknown;
  reassigningFace: unknown;
  hasPrev: boolean;
  hasNext: boolean;
  goPrev: () => void;
  goNext: () => void;
  onClose: () => void;
  onClearFullscreen: () => void;
  onClearAssigning: () => void;
  onClearReassigning: () => void;
}

function isTypingTarget(target: HTMLElement | null): boolean {
  const tag = target?.tagName?.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    target?.getAttribute("contenteditable") === "true"
  );
}

export function useMediaViewerKeyboard({
  fullscreen,
  assigningFace,
  reassigningFace,
  hasPrev,
  hasNext,
  goPrev,
  goNext,
  onClose,
  onClearFullscreen,
  onClearAssigning,
  onClearReassigning,
}: UseMediaViewerKeyboardOptions) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (fullscreen) onClearFullscreen();
        else if (assigningFace) onClearAssigning();
        else if (reassigningFace) onClearReassigning();
        else onClose();
      }
      if (isTypingTarget(document.activeElement as HTMLElement | null)) return;
      const navBlocked = assigningFace || reassigningFace || fullscreen;
      if (navBlocked) return;
      if (e.key === "ArrowLeft" && hasPrev) goPrev();
      if (e.key === "ArrowRight" && hasNext) goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    fullscreen,
    assigningFace,
    reassigningFace,
    hasPrev,
    hasNext,
    goPrev,
    goNext,
    onClose,
    onClearFullscreen,
    onClearAssigning,
    onClearReassigning,
  ]);
}
