// CornMute settings that change between releases. Keep this file tiny.

// Chrome Web Store item ID (32 letters a–p), from the developer dashboard URL.
// While it's empty, the "Leave a review" link stays hidden.
export const STORE_ITEM_ID = '';

export const LINKS = {
  privacy: 'https://alecbuilds247.github.io/cornmute-site/privacy.html',
  x: 'https://x.com/AlecBuilds247',
};

export const REVIEW_MIN_COUNT = 3;

export function reviewUrl(itemId = STORE_ITEM_ID) {
  return /^[a-p]{32}$/.test(itemId) ? `https://chromewebstore.google.com/detail/${itemId}/reviews` : null;
}

// Show the review link only after CornMute has helped a few times, never after it was dismissed.
export function shouldShowReview(count, dismissed, itemId = STORE_ITEM_ID) {
  return !dismissed && Number(count) >= REVIEW_MIN_COUNT && !!reviewUrl(itemId);
}
