export const PERSON_PREVIEW_PAGE_SIZE = 50;

export const remainingPersonPhotos = (
  photoCount: number,
  visibleCount: number,
): number => Math.max(0, photoCount - visibleCount);

export const hasMorePersonPhotos = (
  photoCount: number,
  visibleCount: number,
): boolean => visibleCount < photoCount;
