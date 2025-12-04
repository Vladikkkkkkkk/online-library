const axios = require('axios');
const config = require('../config');


class OpenLibraryService {
  constructor() {
    this.baseUrl = config.openLibrary.baseUrl;
    this.coversUrl = config.openLibrary.coversUrl;
  }


  async searchBooks(query, options = {}) {
    const {
      page = 1,
      limit = 10,
      language,
      subject,
      author,
      title,
      publisher,
      yearFrom,
      yearTo,
    } = options;

    try {
      const params = new URLSearchParams({
        page,
        limit,
        fields: 'key,title,author_name,first_publish_year,isbn,cover_i,cover_id,subject,language,language_key,number_of_pages_median,publisher,has_fulltext,ia,ratings_count,ratings_average',
      });


      const searchParts = [];


      if (query && query.trim()) {
        searchParts.push(query.trim());
      }


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

        searchParts.push(`subject:${subject.trim()}`);
      }
      if (language && language.trim()) {


        const langCode = this.normalizeLanguageCode(language.trim());


        searchParts.push(`language:${langCode}`);
      }


      if (yearFrom || yearTo) {
        const from = yearFrom || '*';
        const to = yearTo || '*';
        searchParts.push(`first_publish_year:[${from} TO ${to}]`);
      }


      let searchQuery;
      if (searchParts.length > 0) {

        searchQuery = searchParts.join(' AND ');
      } else {

        searchQuery = '*';
      }

      params.append('q', searchQuery);

      const url = `${this.baseUrl}/search.json?${params.toString()}`;
      console.log('Open Library search URL:', url.replace(/[?&]key=[^&]*/g, '')); 

      const response = await axios.get(url);

      let books = response.data.docs.map(this.transformBookData.bind(this));


      if (language && language.trim()) {
        const langCode = this.normalizeLanguageCode(language.trim());
        const langKey = `/languages/${langCode}`;
        const originalCount = books.length;
        books = books.filter(book => {
          if (!book.languages || !Array.isArray(book.languages) || book.languages.length === 0) {
            return false; 
          }


          return book.languages.some(lang => {

            const normalizedLang = typeof lang === 'string' 
              ? lang.toLowerCase().replace(/^\/languages\//, '')
              : String(lang).toLowerCase();


            return normalizedLang === langCode || 
                   normalizedLang === langKey.toLowerCase().replace(/^\/languages\//, '') ||
                   lang === langKey ||
                   lang === langCode;
          });
        });


        if (originalCount !== books.length) {
          console.log(`Language filter: ${originalCount} -> ${books.length} books (filtered for ${langCode})`);
        }
      }

      return {
        total: books.length, 
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


    let normalized = lang.toLowerCase().replace(/^\/languages\//, '');


    if (normalized.length === 3) {
      return normalized;
    }


    return langMap[normalized] || normalized;
  }


  normalizeLanguages(languages) {
    if (!Array.isArray(languages)) {
      return [];
    }

    return languages.map(lang => {
      if (typeof lang === 'string') {

        return lang.replace(/^\/languages\//, '').toLowerCase();
      }
      return String(lang).toLowerCase();
    });
  }


  async getBookById(olid) {
    try {

      let openLibraryRating = null;
      let openLibraryRatingCount = 0;
      let searchCoverId = null; 
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


      const editionsResponse = await axios.get(`${this.baseUrl}/works/${olid}/editions.json?limit=20`);
      const editions = editionsResponse.data.entries || [];

      const bookData = this.transformDetailedBookData(book, authors, editions, searchCoverId);

      bookData.openLibraryRating = openLibraryRating;
      bookData.openLibraryRatingCount = openLibraryRatingCount;

      return bookData;
    } catch (error) {
      console.error('Open Library get book error:', error.message);
      throw new Error('Failed to get book from Open Library');
    }
  }


  async getBookByISBN(isbn) {
    try {
      const response = await axios.get(`${this.baseUrl}/isbn/${isbn}.json`);
      return response.data;
    } catch (error) {
      console.error('Open Library ISBN error:', error.message);
      return null;
    }
  }


  async getBooksBySubject(subject, options = {}) {
    const { limit = 10, offset = 0 } = options;

    try {

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

      return {
        name: subject,
        total: 0,
        books: [],
      };
    }
  }


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


      const workKeys = works.map(work => work.key).filter(Boolean);


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


  async getBookRatings(olid, isbn = null) {


    return null;
  }


  getCoverUrl(type, value, size = 'M') {
    if (!value) return null;
    return `${this.coversUrl}/b/${type}/${value}-${size}.jpg`;
  }


  transformBookData(book) {

    let coverUrl = null;
    let coverId = book.cover_i || book.cover_id;

    if (coverId) {
      coverUrl = `${this.coversUrl}/b/id/${coverId}-M.jpg`;
    } else if (book.isbn?.[0]) {

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
      languages: this.normalizeLanguages(book.language || book.language_key || []), 
      pageCount: book.number_of_pages_median,
      publishers: book.publisher?.slice(0, 3) || [],
      hasFulltext: book.has_fulltext || false,
      ia: book.ia || [], 

      openLibraryRating: book.ratings_average ? Number(book.ratings_average) : null,
      openLibraryRatingCount: book.ratings_count || 0,
    };
  }


  transformDetailedBookData(book, authors, editions, searchCoverId = null) {


    let coverId = book.covers?.[0] || searchCoverId;


    if (!coverId && editions.length > 0) {
      const firstEdition = editions[0];
      coverId = firstEdition.covers?.[0] || firstEdition.cover_id;
    }


    let isbnCoverUrl = null;
    if (!coverId && editions.length > 0) {
      const firstEdition = editions[0];
      const isbn = firstEdition.isbn_13?.[0] || firstEdition.isbn_10?.[0];
      if (isbn) {

        isbnCoverUrl = `${this.coversUrl}/b/isbn/${isbn}-L.jpg`;
      }
    }


    let downloadLinks = [];
    const foundOcaids = new Set(); 

    for (const edition of editions) {
      if (edition.ocaid && !foundOcaids.has(edition.ocaid)) {
        foundOcaids.add(edition.ocaid);


        downloadLinks.push({
          format: 'Read Online',
          url: `https://archive.org/details/${edition.ocaid}`,
        });


        const possiblePdfNames = [
          `${edition.ocaid}.pdf`,
          `${edition.ocaid}_djvu.pdf`,
          `${edition.ocaid}_text.pdf`,
        ];


        downloadLinks.push({
          format: 'PDF',
          url: `https://archive.org/download/${edition.ocaid}/${edition.ocaid}.pdf`,
          ocaid: edition.ocaid, 
        });


        downloadLinks.push({
          format: 'EPUB',
          url: `https://archive.org/download/${edition.ocaid}/${edition.ocaid}.epub`,
        });


        if (foundOcaids.size >= 3) break;
      }
    }


    let publishYear = null;
    if (book.first_publish_date) {
      const dateStr = book.first_publish_date;

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
      languages: this.normalizeLanguages(book.languages || []), 
      coverId,

      coverUrl: coverId 
        ? `${this.coversUrl}/b/id/${coverId}-L.jpg`
        : isbnCoverUrl,
      publishYear,
      firstPublishDate: book.first_publish_date,
      downloadLinks,

      isbn: editions[0]?.isbn_13?.[0] || editions[0]?.isbn_10?.[0] || null,
      publisher: editions[0]?.publishers?.[0] || null,
      publishers: editions[0]?.publishers || [],
      pageCount: editions[0]?.number_of_pages || null,
      numberOfPages: editions[0]?.number_of_pages || null, 
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

      openLibraryRating: book.ratings?.average ? Number(book.ratings.average) : null,
      openLibraryRatingCount: book.ratings?.count || 0,
    };
  }
}

module.exports = new OpenLibraryService();

