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

export type FaceMatchAutoMerged = { merged: number; into: number; intoName: string };

export type FaceMatchReviewItem = {
  placeholderPersonId: number;
  placeholderName: string;
  hasFaceDescriptors: boolean;
  topMatch: { personId: number; name: string; score: number } | null;
  otherMatches: Array<{ personId: number; name: string; score: number }>;
  previewMediaId: string | null;
  previewFaceCrop: boolean;
};

export type FaceMatchRunResponse = {
  autoMerged: FaceMatchAutoMerged[];
  reviewQueue: FaceMatchReviewItem[];
};
