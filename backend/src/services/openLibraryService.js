const axios = require('axios');
const config = require('../config');

/**
 * Service for interacting with Open Library API
 * Documentation: https://openlibrary.org/developers/api
 */
class OpenLibraryService {
  constructor() {
    this.baseUrl = config.openLibrary.baseUrl;
    this.coversUrl = config.openLibrary.coversUrl;
  }

  /**
   * Search books by query using Open Library search syntax
   * @param {string} query - Search query (general search or keywords)
   * @param {object} options - Search options
   * @returns {Promise<object>} - Search results
   */
  async searchBooks(query, options = {}) {
    const {
      page = 1,
      limit = 10,
      language,
      subject,
      author,
      title,
      publisher,
      keywords,
      yearFrom,
      yearTo,
    } = options;

    try {
      const params = new URLSearchParams({
        page,
        limit,
        fields: 'key,title,author_name,first_publish_year,isbn,cover_i,cover_id,subject,language,language_key,number_of_pages_median,publisher,has_fulltext,ia,ratings_count,ratings_average',
      });

      // Build search query using Open Library syntax
      const searchParts = [];

      // Keywords search - search only in books with full text available
      // This is the closest we can get to "search inside book" without using archive.org API
      if (keywords && keywords.trim()) {
        // For full-text search, we need books that have full text available
        searchParts.push(`has_fulltext:true`);
        searchParts.push(keywords.trim());
      }
      // General query - normal metadata search
      else if (query && query.trim()) {
        searchParts.push(query.trim());
      }

      // Specific field searches using Open Library syntax
      // These are added as field:value pairs
      if (title && title.trim()) {
        const escapedTitle = title.trim();
        searchParts.push(`title:${escapedTitle}`);
      }
      if (author && author.trim()) {
        const escapedAuthor = author.trim();
        searchParts.push(`author:${escapedAuthor}`);
      }
      if (publisher && publisher.trim()) {
        const escapedPublisher = publisher.trim();
        searchParts.push(`publisher:${escapedPublisher}`);
      }
      if (subject && subject.trim()) {
        // Subject might have spaces, keep them as-is (Open Library handles it)
        searchParts.push(`subject:${subject.trim()}`);
      }
      if (language && language.trim()) {
        // Open Library uses language codes (eng, ukr, etc.)
        // Use language field for initial filtering
        // Post-filtering will ensure exact matches
        const langCode = this.normalizeLanguageCode(language.trim());
        // Use language field (standard in search API)
        // Post-filtering will handle normalization and exact matching
        searchParts.push(`language:${langCode}`);
      }

      // Year range using Open Library syntax: first_publish_year:[FROM TO]
      if (yearFrom || yearTo) {
        const from = yearFrom || '*';
        const to = yearTo || '*';
        searchParts.push(`first_publish_year:[${from} TO ${to}]`);
      }

      // Build final query
      let searchQuery;
      if (searchParts.length > 0) {
        // Combine all parts with AND
        searchQuery = searchParts.join(' AND ');
      } else {
        // If no parameters, use wildcard to get all books
        searchQuery = '*';
      }

      params.append('q', searchQuery);

      const url = `${this.baseUrl}/search.json?${params.toString()}`;
      console.log('Open Library search URL:', url.replace(/[?&]key=[^&]*/g, '')); // Log without sensitive data
      
      const response = await axios.get(url);
      
      let books = response.data.docs.map(this.transformBookData.bind(this));
      
      // Post-filter by language if specified (to ensure exact language match)
      // Open Library's language field can contain multiple formats:
      // - Array of language codes: ["eng", "ukr"]
      // - Array of language keys: ["/languages/eng", "/languages/ukr"]
      // We need to normalize and check both formats
      if (language && language.trim()) {
        const langCode = this.normalizeLanguageCode(language.trim());
        const langKey = `/languages/${langCode}`;
        const originalCount = books.length;
        books = books.filter(book => {
          if (!book.languages || !Array.isArray(book.languages) || book.languages.length === 0) {
            return false; // Exclude books without language info
          }
          
          // Check if any language matches (supporting both formats)
          return book.languages.some(lang => {
            // Normalize language value
            const normalizedLang = typeof lang === 'string' 
              ? lang.toLowerCase().replace(/^\/languages\//, '')
              : String(lang).toLowerCase();
            
            // Check if it matches our target language code
            return normalizedLang === langCode || 
                   normalizedLang === langKey.toLowerCase().replace(/^\/languages\//, '') ||
                   lang === langKey ||
                   lang === langCode;
          });
        });
        
        // Log filtering info for debugging
        if (originalCount !== books.length) {
          console.log(`Language filter: ${originalCount} -> ${books.length} books (filtered for ${langCode})`);
        }
      }
      
      return {
        total: books.length, // Adjusted total after language filtering
        books,
      };
    } catch (error) {
      console.error('Open Library search error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error('Failed to search books from Open Library');
    }
  }

  /**
   * Normalize language code for Open Library
   * Open Library uses 3-letter codes: eng, ukr, deu, fra, etc.
   */
  normalizeLanguageCode(lang) {
    const langMap = {
      'en': 'eng',
      'uk': 'ukr',
      'de': 'deu',
      'fr': 'fra',
      'es': 'spa',
      'it': 'ita',
      'ru': 'rus',
      'pl': 'pol',
      'ja': 'jpn',
      'zh': 'chi',
      'ar': 'ara',
    };
    
    // Remove /languages/ prefix if present
    let normalized = lang.toLowerCase().replace(/^\/languages\//, '');
    
    // If already 3-letter code, return as is
    if (normalized.length === 3) {
      return normalized;
    }
    
    // Map 2-letter codes to 3-letter
    return langMap[normalized] || normalized;
  }

  /**
   * Normalize languages array from Open Library
   * Handles both formats: ["eng", "ukr"] and ["/languages/eng", "/languages/ukr"]
   */
  normalizeLanguages(languages) {
    if (!Array.isArray(languages)) {
      return [];
    }
    
    return languages.map(lang => {
      if (typeof lang === 'string') {
        // Remove /languages/ prefix and return just the code
        return lang.replace(/^\/languages\//, '').toLowerCase();
      }
      return String(lang).toLowerCase();
    });
  }

  /**
   * Get book details by Open Library ID
   * @param {string} olid - Open Library ID (e.g., OL123456W)
   * @returns {Promise<object>} - Book details
   */
  async getBookById(olid) {
    try {
      // First, try to get ratings and cover from search API (works endpoint doesn't include ratings)
      let openLibraryRating = null;
      let openLibraryRatingCount = 0;
      let searchCoverId = null; // Fallback cover ID from search API
      try {
        const searchResponse = await axios.get(
          `${this.baseUrl}/search.json?q=key:/works/${olid}&fields=key,ratings_average,ratings_count,cover_i,isbn&limit=1`
        );
        if (searchResponse.data.docs && searchResponse.data.docs.length > 0) {
          const searchBook = searchResponse.data.docs[0];
          openLibraryRating = searchBook.ratings_average ? Number(searchBook.ratings_average) : null;
          openLibraryRatingCount = searchBook.ratings_count || 0;
          searchCoverId = searchBook.cover_i || null;
        }
      } catch (searchError) {
        console.warn(`Could not fetch ratings/cover for ${olid} from search API:`, searchError.message);
      }

      const response = await axios.get(`${this.baseUrl}/works/${olid}.json`);
      const book = response.data;

      // Get author details
      let authors = [];
      if (book.authors) {
        const authorPromises = book.authors.map(async (author) => {
          const authorKey = author.author?.key || author.key;
          if (authorKey) {
            try {
              const authorResponse = await axios.get(`${this.baseUrl}${authorKey}.json`);
              return authorResponse.data;
            } catch {
              return null;
            }
          }
          return null;
        });
        authors = (await Promise.all(authorPromises)).filter(Boolean);
      }

      // Get editions for download links - increase limit to find more available files
      const editionsResponse = await axios.get(`${this.baseUrl}/works/${olid}/editions.json?limit=20`);
      const editions = editionsResponse.data.entries || [];

      const bookData = this.transformDetailedBookData(book, authors, editions, searchCoverId);
      // Override with ratings from search API if available
      bookData.openLibraryRating = openLibraryRating;
      bookData.openLibraryRatingCount = openLibraryRatingCount;

      return bookData;
    } catch (error) {
      console.error('Open Library get book error:', error.message);
      throw new Error('Failed to get book from Open Library');
    }
  }

  /**
   * Get book by ISBN
   * @param {string} isbn - ISBN number
   * @returns {Promise<object>} - Book details
   */
  async getBookByISBN(isbn) {
    try {
      const response = await axios.get(`${this.baseUrl}/isbn/${isbn}.json`);
      return response.data;
    } catch (error) {
      console.error('Open Library ISBN error:', error.message);
      return null;
    }
  }

  /**
   * Get books by subject/category
   * @param {string} subject - Subject/category name
   * @param {object} options - Options
   * @returns {Promise<object>} - Books list
   */
  async getBooksBySubject(subject, options = {}) {
    const { limit = 10, offset = 0 } = options;

    try {
      // Encode subject for URL (replace spaces with underscores, lowercase)
      const encodedSubject = encodeURIComponent(subject.toLowerCase().replace(/\s+/g, '_'));
      
      const response = await axios.get(
        `${this.baseUrl}/subjects/${encodedSubject}.json?limit=${limit}&offset=${offset}`
      );
      
      return {
        name: response.data.name,
        total: response.data.work_count || 0,
        books: (response.data.works || []).map((work) => ({
          openLibraryId: work.key?.replace('/works/', ''),
          title: work.title,
          authors: work.authors?.map((a) => a.name) || [],
          coverId: work.cover_id,
          coverUrl: work.cover_id 
            ? `${this.coversUrl}/b/id/${work.cover_id}-M.jpg`
            : null,
          publishYear: work.first_publish_year,
          subjects: work.subject?.slice(0, 5) || [],
        })),
      };
    } catch (error) {
      console.error('Open Library subject error:', error.message);
      // Return empty results instead of throwing
      return {
        name: subject,
        total: 0,
        books: [],
      };
    }
  }

  /**
   * Get trending/popular books
   * @param {string} type - Type: daily, weekly, monthly, yearly
   * @param {number} limit - Number of books
   * @returns {Promise<Array>} - List of trending books
   */
  async getTrendingBooks(type = 'daily', limit = 10) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/trending/${type}.json?limit=${limit}`,
        { timeout: 8000 }
      );
      
      const works = response.data.works || [];
      if (works.length === 0) {
        return [];
      }
      
      // Extract all work keys for batch rating fetch
      const workKeys = works.map(work => work.key).filter(Boolean);
      
      // Batch fetch ratings for all books at once
      let ratingsMap = {};
      if (workKeys.length > 0) {
        try {
          const keys = workKeys.map(key => `key:${key}`).join(' OR ');
          const batchRatingResponse = await axios.get(
            `${this.baseUrl}/search.json?q=(${keys})&fields=key,ratings_average,ratings_count&limit=${workKeys.length}`,
            { timeout: 10000 }
          );
          
          if (batchRatingResponse.data.docs) {
            batchRatingResponse.data.docs.forEach(doc => {
              const key = doc.key;
              if (key) {
                ratingsMap[key] = {
                  rating: doc.ratings_average ? Number(doc.ratings_average) : null,
                  count: doc.ratings_count || 0,
                };
              }
            });
          }
        } catch (batchError) {
          console.warn('Batch ratings fetch failed for trending books:', batchError.message);
        }
      }
      
      // Map works to books with ratings
      const booksWithRatings = works.map((work) => {
        const openLibraryId = work.key?.replace('/works/', '');
        const ratings = ratingsMap[work.key] || { rating: null, count: 0 };
        
        return {
          openLibraryId,
          title: work.title,
          authors: work.author_name || [],
          coverId: work.cover_i,
          coverUrl: work.cover_i 
            ? `${this.coversUrl}/b/id/${work.cover_i}-M.jpg`
            : null,
          firstPublishYear: work.first_publish_year,
          publishYear: work.first_publish_year,
          openLibraryRating: ratings.rating,
          openLibraryRatingCount: ratings.count,
        };
      });
      
      return booksWithRatings;
    } catch (error) {
      console.error('Open Library trending error:', error.message);
      return [];
    }
  }

  /**
   * Get book ratings (placeholder - Open Library doesn't provide ratings)
   * This is a placeholder for future integration with Goodreads or other rating APIs
   * @param {string} olid - Open Library ID
   * @param {string} isbn - ISBN (optional, for cross-referencing)
   * @returns {Promise<object|null>} - Ratings object or null
   */
  async getBookRatings(olid, isbn = null) {
    // Open Library API doesn't provide ratings/reviews
    // This is a placeholder for future integration
    // Options: Goodreads API, LibraryThing API, Google Books API
    
    // TODO: Implement integration with external rating services
    // Example structure:
    // {
    //   averageRating: 4.5,
    //   ratingsCount: 1250,
    //   reviewsCount: 340,
    //   source: 'goodreads'
    // }
    
    return null;
  }

  /**
   * Get cover URL by cover ID or ISBN
   * @param {string} type - Type: id, isbn, olid
   * @param {string} value - Value
   * @param {string} size - Size: S, M, L
   * @returns {string} - Cover URL
   */
  getCoverUrl(type, value, size = 'M') {
    if (!value) return null;
    return `${this.coversUrl}/b/${type}/${value}-${size}.jpg`;
  }

  /**
   * Transform book data from search results
   */
  transformBookData(book) {
    // Get cover URL - try cover_i first, then cover_id, then ISBN as fallback
    let coverUrl = null;
    let coverId = book.cover_i || book.cover_id;
    
    if (coverId) {
      coverUrl = `${this.coversUrl}/b/id/${coverId}-M.jpg`;
    } else if (book.isbn?.[0]) {
      // Try ISBN-based cover as fallback
      coverUrl = `${this.coversUrl}/b/isbn/${book.isbn[0]}-M.jpg`;
    }
    
    return {
      openLibraryId: book.key?.replace('/works/', ''),
      title: book.title,
      authors: book.author_name || [],
      publishYear: book.first_publish_year,
      isbn: book.isbn?.[0],
      coverId,
      coverUrl,
      subjects: book.subject?.slice(0, 5) || [],
      languages: this.normalizeLanguages(book.language || book.language_key || []), // Array of language codes
      pageCount: book.number_of_pages_median,
      publishers: book.publisher?.slice(0, 3) || [],
      hasFulltext: book.has_fulltext || false,
      ia: book.ia || [], // Internet Archive identifiers
      // Open Library ratings
      openLibraryRating: book.ratings_average ? Number(book.ratings_average) : null,
      openLibraryRatingCount: book.ratings_count || 0,
    };
  }

  /**
   * Transform detailed book data
   * @param {object} book - Book data from works API
   * @param {array} authors - Author data
   * @param {array} editions - Editions data
   * @param {number} searchCoverId - Cover ID from search API (fallback)
   */
  transformDetailedBookData(book, authors, editions, searchCoverId = null) {
    // Try multiple sources for cover ID:
    // 1. covers[0] from works API (most reliable for detailed view)
    // 2. cover_i from search API (fallback if works API doesn't have it)
    // 3. Try to get from first edition if available
    let coverId = book.covers?.[0] || searchCoverId;
    
    // If still no cover, try to get from first edition
    if (!coverId && editions.length > 0) {
      const firstEdition = editions[0];
      coverId = firstEdition.covers?.[0] || firstEdition.cover_id;
    }
    
    // If still no cover, try ISBN from first edition
    let isbnCoverUrl = null;
    if (!coverId && editions.length > 0) {
      const firstEdition = editions[0];
      const isbn = firstEdition.isbn_13?.[0] || firstEdition.isbn_10?.[0];
      if (isbn) {
        // Try ISBN-13 first, then ISBN-10
        isbnCoverUrl = `${this.coversUrl}/b/isbn/${isbn}-L.jpg`;
      }
    }
    
    // Find available download links from editions
    // Try to find editions with ocaid (Open Content Archive ID) for Archive.org access
    let downloadLinks = [];
    const foundOcaids = new Set(); // Avoid duplicates
    
    for (const edition of editions) {
      if (edition.ocaid && !foundOcaids.has(edition.ocaid)) {
        foundOcaids.add(edition.ocaid);
        
        // Archive.org provides multiple formats
        downloadLinks.push({
          format: 'Read Online',
          url: `https://archive.org/details/${edition.ocaid}`,
        });
        
        // Try different possible PDF filenames on Archive.org
        // Archive.org files can have different naming conventions
        const possiblePdfNames = [
          `${edition.ocaid}.pdf`,
          `${edition.ocaid}_djvu.pdf`,
          `${edition.ocaid}_text.pdf`,
        ];
        
        // Use the most common format first
        downloadLinks.push({
          format: 'PDF',
          url: `https://archive.org/download/${edition.ocaid}/${edition.ocaid}.pdf`,
          ocaid: edition.ocaid, // Store ocaid for verification
        });
        
        // Also add EPUB if available
        downloadLinks.push({
          format: 'EPUB',
          url: `https://archive.org/download/${edition.ocaid}/${edition.ocaid}.epub`,
        });
        
        // Limit to first 3 editions with ocaid to avoid too many links
        if (foundOcaids.size >= 3) break;
      }
    }

    // Extract year from first_publish_date
    let publishYear = null;
    if (book.first_publish_date) {
      const dateStr = book.first_publish_date;
      // Handle different date formats: "2001", "2001-01", "2001-01-01"
      const yearMatch = dateStr.match(/^\d{4}/);
      if (yearMatch) {
        publishYear = parseInt(yearMatch[0], 10);
      }
    }

    return {
      openLibraryId: book.key?.replace('/works/', ''),
      title: book.title,
      description: typeof book.description === 'object' 
        ? book.description.value 
        : book.description,
      authors: authors.map((a) => ({
        name: a.name,
        biography: typeof a.bio === 'object' ? a.bio.value : a.bio,
        birthDate: a.birth_date,
        deathDate: a.death_date,
        photoUrl: a.photos?.[0] 
          ? `${this.coversUrl}/a/id/${a.photos[0]}-M.jpg`
          : null,
      })),
      subjects: book.subjects?.slice(0, 10) || [],
      languages: this.normalizeLanguages(book.languages || []), // Languages from work
      coverId,
      // Use cover ID if available, otherwise try ISBN-based cover URL
      coverUrl: coverId 
        ? `${this.coversUrl}/b/id/${coverId}-L.jpg`
        : isbnCoverUrl,
      publishYear,
      firstPublishDate: book.first_publish_date,
      downloadLinks,
      editions: editions.map((e) => ({
        title: e.title,
        isbn: e.isbn_13?.[0] || e.isbn_10?.[0],
        publishers: e.publishers,
        publishDate: e.publish_date,
        pageCount: e.number_of_pages,
        language: e.languages?.map((l) => {
          const langKey = l.key || l;
          return typeof langKey === 'string' 
            ? langKey.replace('/languages/', '').toLowerCase()
            : String(langKey).toLowerCase();
        }) || [],
      })),
      // Open Library ratings (from work data if available)
      openLibraryRating: book.ratings?.average ? Number(book.ratings.average) : null,
      openLibraryRatingCount: book.ratings?.count || 0,
    };
  }
}

module.exports = new OpenLibraryService();

