export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TaggedFace extends FaceBox {
  personId: number;
  name: string;
}
