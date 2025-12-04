
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


function getOpenLibrarySubject(categorySlug) {
  if (!categorySlug) return null;

  const normalizedSlug = categorySlug.toLowerCase().trim();
  return categoryToOpenLibrarySubject[normalizedSlug] || normalizedSlug;
}


function getOpenLibrarySubjects(categorySlug) {
  const primary = getOpenLibrarySubject(categorySlug);
  if (!primary) return [];


  const variations = [primary];


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

