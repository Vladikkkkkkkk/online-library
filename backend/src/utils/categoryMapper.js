/**
 * Maps our internal categories to Open Library subjects
 * Open Library uses lowercase subjects with hyphens
 */
const categoryToOpenLibrarySubject = {
  'fiction': 'fiction',
  'science-fiction': 'science_fiction',
  'mystery': 'mystery',
  'romance': 'romance',
  'history': 'history',
  'science': 'science',
  'philosophy': 'philosophy',
  'psychology': 'psychology',
  'programming': 'computers',
  'children': 'juvenile_fiction',
  'poetry': 'poetry',
  'classic': 'classic_literature',
};

/**
 * Get Open Library subject from our category slug
 * @param {string} categorySlug - Our category slug
 * @returns {string|null} - Open Library subject or null
 */
function getOpenLibrarySubject(categorySlug) {
  if (!categorySlug) return null;
  
  const normalizedSlug = categorySlug.toLowerCase().trim();
  return categoryToOpenLibrarySubject[normalizedSlug] || normalizedSlug;
}

/**
 * Get multiple Open Library subjects (for fallback search)
 * @param {string} categorySlug - Our category slug
 * @returns {string[]} - Array of possible Open Library subjects
 */
function getOpenLibrarySubjects(categorySlug) {
  const primary = getOpenLibrarySubject(categorySlug);
  if (!primary) return [];
  
  // Add variations for better results
  const variations = [primary];
  
  // Add common variations
  if (primary.includes('_')) {
    variations.push(primary.replace(/_/g, ' '));
  }
  
  return variations;
}

module.exports = {
  getOpenLibrarySubject,
  getOpenLibrarySubjects,
  categoryToOpenLibrarySubject,
};

