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
   * Search books by query
   * @param {string} query - Search query
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
    } = options;

    try {
      const params = new URLSearchParams({
        q: query,
        page,
        limit,
        fields: 'key,title,author_name,first_publish_year,isbn,cover_i,subject,language,number_of_pages_median,publisher',
      });

      if (language) params.append('language', language);
      if (subject) params.append('subject', subject);
      if (author) params.append('author', author);

      const response = await axios.get(`${this.baseUrl}/search.json?${params}`);
      
      return {
        total: response.data.numFound,
        books: response.data.docs.map(this.transformBookData.bind(this)),
      };
    } catch (error) {
      console.error('Open Library search error:', error.message);
      throw new Error('Failed to search books from Open Library');
    }
  }

  /**
   * Get book details by Open Library ID
   * @param {string} olid - Open Library ID (e.g., OL123456W)
   * @returns {Promise<object>} - Book details
   */
  async getBookById(olid) {
    try {
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

      return this.transformDetailedBookData(book, authors, editions);
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
        `${this.baseUrl}/trending/${type}.json?limit=${limit}`
      );
      
      return response.data.works.map((work) => ({
        openLibraryId: work.key?.replace('/works/', ''),
        title: work.title,
        authors: work.author_name || [],
        coverId: work.cover_i,
        coverUrl: work.cover_i 
          ? `${this.coversUrl}/b/id/${work.cover_i}-M.jpg`
          : null,
        firstPublishYear: work.first_publish_year,
      }));
    } catch (error) {
      console.error('Open Library trending error:', error.message);
      return [];
    }
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
    return {
      openLibraryId: book.key?.replace('/works/', ''),
      title: book.title,
      authors: book.author_name || [],
      publishYear: book.first_publish_year,
      isbn: book.isbn?.[0],
      coverId: book.cover_i,
      coverUrl: book.cover_i 
        ? `${this.coversUrl}/b/id/${book.cover_i}-M.jpg`
        : null,
      subjects: book.subject?.slice(0, 5) || [],
      languages: book.language || [],
      pageCount: book.number_of_pages_median,
      publishers: book.publisher?.slice(0, 3) || [],
    };
  }

  /**
   * Transform detailed book data
   */
  transformDetailedBookData(book, authors, editions) {
    const coverId = book.covers?.[0];
    
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
      coverId,
      coverUrl: coverId 
        ? `${this.coversUrl}/b/id/${coverId}-L.jpg`
        : null,
      firstPublishDate: book.first_publish_date,
      downloadLinks,
      editions: editions.map((e) => ({
        title: e.title,
        isbn: e.isbn_13?.[0] || e.isbn_10?.[0],
        publishers: e.publishers,
        publishDate: e.publish_date,
        pageCount: e.number_of_pages,
        language: e.languages?.map((l) => l.key?.replace('/languages/', '')),
      })),
    };
  }
}

module.exports = new OpenLibraryService();

