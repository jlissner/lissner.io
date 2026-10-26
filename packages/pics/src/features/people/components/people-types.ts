export interface Person {
  id: number;
  name: string;
  photoCount?: number;
  representativeMediaId?: string | null;
}

export interface MergeSuggestion {
  personId: number;
  name: string;
  score: number;
}
