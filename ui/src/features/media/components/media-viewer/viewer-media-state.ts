import { isImage, isPdf, isText, isVideo } from "./media-type-checks";

export function hasMotionCompanion(
  motionCompanionId: string | null | undefined,
): boolean {
  return motionCompanionId != null && motionCompanionId !== "";
}

export interface StillImageViewInput {
  mimeType: string;
  originalName: string;
  pixelMp: boolean;
  pixelIsVideo: boolean;
  hasMotionPair: boolean;
  motionPairView: "video" | "still";
}

export interface StillImageViewState {
  showingStillFrame: boolean;
  isRegularStillImage: boolean;
  isPixelStillImage: boolean;
  isItemImage: boolean;
  canTagFaces: boolean;
}

export function deriveStillImageView(
  input: StillImageViewInput,
): StillImageViewState {
  const showingStillFrame =
    !input.hasMotionPair || input.motionPairView === "still";
  const isImageItem = isImage(input.mimeType, input.originalName);

  return {
    showingStillFrame,
    isRegularStillImage: isImageItem && !input.pixelMp && showingStillFrame,
    isPixelStillImage:
      input.pixelMp && !isVideo(input.mimeType) && showingStillFrame,
    isItemImage: isImageItem && !input.pixelIsVideo && showingStillFrame,
    canTagFaces:
      isImageItem &&
      (!input.pixelMp || !input.pixelIsVideo) &&
      showingStillFrame,
  };
}

export function viewerImageClassName(options: {
  taggingMode: boolean;
  zoomable: boolean;
}): string {
  return [
    "viewer-content__image",
    options.taggingMode ? "viewer-content__image--tagging" : "",
    options.zoomable ? "viewer-content__image--zoomable" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function stillImageActionFlags(state: {
  isItemImage: boolean;
  taggingMode: boolean;
  assigningFace: unknown;
  reassigningFace: unknown;
  hasMotionPair: boolean;
  deleting: boolean;
}): { canOpenFullscreen: boolean; canRotateImage: boolean } {
  const enabled =
    state.isItemImage &&
    !state.taggingMode &&
    !state.assigningFace &&
    !state.reassigningFace;

  return {
    canOpenFullscreen: enabled && !state.deleting,
    canRotateImage: enabled && !state.hasMotionPair,
  };
}

export function isMediaPreviewUnavailable(
  mimeType: string,
  originalName: string,
  pixelMp: boolean,
): boolean {
  return (
    !isImage(mimeType, originalName) &&
    !isVideo(mimeType) &&
    !pixelMp &&
    !isText(mimeType, originalName) &&
    !isPdf(mimeType)
  );
}
