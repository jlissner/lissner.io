export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  detectorScore?: number | null;
}

export interface TaggedFace extends FaceBox {
  personId: number;
  name: string;
  confidence?: number | null;
  source?: "auto" | "manual";
}
