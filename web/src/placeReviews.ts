import type { Item } from './api';

export type PlaceReview = { place: Item; rating: number; text: string; updatedAt: number };
const key = 'mumu.place-reviews';

export function placeReviews(): PlaceReview[] {
  try {
    const rows = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(rows) ? rows.filter(row => typeof row?.place?.id === 'string' &&
      Number.isInteger(row.rating) && row.rating >= 1 && row.rating <= 5 && typeof row.text === 'string') : [];
  } catch {
    return [];
  }
}

export function savePlaceReview(review: PlaceReview) {
  const reviews = placeReviews().filter(row => row.place.id !== review.place.id);
  localStorage.setItem(key, JSON.stringify([review, ...reviews]));
}
