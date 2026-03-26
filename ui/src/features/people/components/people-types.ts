import type {
  FaceMatchAutoMerged,
  FaceMatchReviewItem,
  FaceMatchRunResponse,
} from "../../../../../shared/src/api.js";

export interface Person {
  id: number;
  name: string;
  photoCount?: number;
}

export interface MergeSuggestion {
  personId: number;
  name: string;
  score: number;
}
export type { FaceMatchAutoMerged, FaceMatchReviewItem, FaceMatchRunResponse };
