const { prisma } = require('../config/database');
const openLibraryService = require('./openLibraryService');
const bookService = require('./bookService');
const cache = require('../utils/cache');
const config = require('../config');
const axios = require('axios');


class RecommendationService {

  async getUserPreferences(userId) {

    const savedBooks = await prisma.savedBook.findMany({
      where: { userId },
      select: { openLibraryId: true },
    });


    const highRatedReviews = await prisma.review.findMany({
      where: {
        userId,
        rating: { gte: 4 }, 
      },
      select: { openLibraryId: true, rating: true },
    });


    const allBookIds = [
      ...savedBooks.slice(0, 15).map(sb => sb.openLibraryId), 
      ...highRatedReviews.map(r => r.openLibraryId),
    ];


    const bookIds = [...new Set(allBookIds)];

    if (bookIds.length === 0) {
      return {}; 
    }


    const subjectsMap = {};
    const ratingMap = {};


    highRatedReviews.forEach(review => {
      ratingMap[review.openLibraryId] = review.rating;
    });


    const cachedBooksMap = {};
    const uncachedBookIds = [];

    for (const bookId of bookIds) {
      const cacheKey = `book:${bookId}`;
      const cached = await cache.get(cacheKey);
      if (cached && cached.subjects) {
        cachedBooksMap[bookId] = cached;
      } else {
        uncachedBookIds.push(bookId);
      }
    }


    const fetchedBooksMap = {};
    if (uncachedBookIds.length > 0) {
      try {

        const keys = uncachedBookIds.map(id => `key:/works/${id}`).join(' OR ');
        const batchResponse = await axios.get(
          `${config.openLibrary.baseUrl}/search.json?q=(${keys})&fields=key,title,subject,ratings_average,ratings_count&limit=${uncachedBookIds.length}`,
          { timeout: 10000 } 
        );

        if (batchResponse.data.docs) {
          for (const doc of batchResponse.data.docs) {
            const id = doc.key?.replace('/works/', '');
            if (id && uncachedBookIds.includes(id)) {
              fetchedBooksMap[id] = {
                subjects: doc.subject?.slice(0, 10) || [], 
              };


              await cache.set(`book:${id}`, {
                ...fetchedBooksMap[id],
                title: doc.title,
                openLibraryRating: doc.ratings_average ? Number(doc.ratings_average) : null,
                openLibraryRatingCount: doc.ratings_count || 0,
              }, 1800); 
            }
          }
        }
      } catch (batchError) {
        console.error('Batch fetch error in recommendations:', batchError.message);
      }
    }


    const bookDetails = bookIds
      .map(bookId => {
        const bookData = cachedBooksMap[bookId] || fetchedBooksMap[bookId];
        if (!bookData || !bookData.subjects) {
          return null;
        }
        return {
          id: bookId,
          subjects: bookData.subjects,
          rating: ratingMap[bookId] || 3,
        };
      })
      .filter(Boolean);


    bookDetails.forEach(({ subjects, rating }) => {
      if (!subjects || subjects.length === 0) return;

      const weight = rating / 5; 
      subjects.forEach(subject => {
        const normalizedSubject = subject.toLowerCase().trim();
        if (normalizedSubject) {
          subjectsMap[normalizedSubject] = (subjectsMap[normalizedSubject] || 0) + weight;
        }
      });
    });

    return subjectsMap;
  }


  async findSimilarBooks(preferences, userId, limit = 10) {
    if (Object.keys(preferences).length === 0) {

      return this.getFallbackRecommendations(limit);
    }


    const excludedBooksCacheKey = `excluded_books:${userId}`;
    let userBookIds = new Set();

    const cachedExcluded = await cache.get(excludedBooksCacheKey);
    if (cachedExcluded) {
      cachedExcluded.forEach(id => userBookIds.add(id));
    } else {

      const userBooks = await prisma.savedBook.findMany({
        where: { userId },
        select: { openLibraryId: true },
      });
      userBooks.forEach(sb => userBookIds.add(sb.openLibraryId));


      const userReviews = await prisma.review.findMany({
        where: { userId },
        select: { openLibraryId: true },
      });
      userReviews.forEach(r => userBookIds.add(r.openLibraryId));


      const excludedIds = Array.from(userBookIds);
      await cache.set(excludedBooksCacheKey, excludedIds, 1800);
    }


    const topSubjects = Object.entries(preferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([subject]) => subject);


    const recommendations = new Map(); 


    for (const subject of topSubjects) {
      try {


        const results = await Promise.race([
          openLibraryService.searchBooks(null, {
            page: 1,
            limit: 15, 
            subject: subject,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          ),
        ]);

        if (results && results.books && results.books.length > 0) {

          results.books.forEach(book => {
            if (userBookIds.has(book.openLibraryId)) {
              return; 
            }

            if (!recommendations.has(book.openLibraryId)) {

              const score = this.calculateSimilarityScore(book, preferences);

              if (score > 0) {
                recommendations.set(book.openLibraryId, {
                  book,
                  score,
                });
              }
            }
          });
        }
      } catch (error) {

        console.warn(`Error searching for subject ${subject}:`, error.message);
      }
    }


    const sortedRecommendations = Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.book);


    if (sortedRecommendations.length < limit) {
      const fallback = await this.getFallbackRecommendations(limit - sortedRecommendations.length);
      const fallbackIds = new Set(sortedRecommendations.map(b => b.openLibraryId));
      const uniqueFallback = fallback.filter(b => 
        !userBookIds.has(b.openLibraryId) && !fallbackIds.has(b.openLibraryId)
      );
      sortedRecommendations.push(...uniqueFallback);
    }


    const booksWithRatings = await Promise.all(
      sortedRecommendations.map(async (book) => {
        const combinedRatings = await bookService.combineRatings(
          book.openLibraryId,
          book.openLibraryRating || null,
          book.openLibraryRatingCount || 0
        );

        return {
          ...book,
          averageRating: combinedRatings.averageRating,
          ratingCount: combinedRatings.ratingCount,
        };
      })
    );

    return booksWithRatings;
  }


  calculateSimilarityScore(book, preferences) {
    if (!book.subjects || book.subjects.length === 0) {
      return 0;
    }

    let score = 0;
    let totalWeight = 0;

    book.subjects.forEach(subject => {
      const normalizedSubject = subject.toLowerCase().trim();
      if (preferences[normalizedSubject]) {
        score += preferences[normalizedSubject];
        totalWeight += preferences[normalizedSubject];
      }
    });

    if (totalWeight === 0) return 0;


    const normalizedScore = score / totalWeight;


    const ratingBoost = book.openLibraryRating 
      ? (book.openLibraryRating / 5) * 0.3 
      : 0;

    return Math.min(1, normalizedScore + ratingBoost);
  }


  async getFallbackRecommendations(limit) {
    try {
      return await bookService.getTrendingBooks('weekly', limit);
    } catch (error) {
      console.error('Error getting fallback recommendations:', error.message);
      return [];
    }
  }


  async getRecommendations(userId, limit = 10) {

    const cacheKey = `recommendations:${userId}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }


    const preferencesCacheKey = `user_preferences:${userId}`;
    let preferences = await cache.get(preferencesCacheKey);

    if (!preferences) {

      preferences = await this.getUserPreferences(userId);

      await cache.set(preferencesCacheKey, preferences, 7200);
    }


    const recommendations = await this.findSimilarBooks(preferences, userId, limit);


    await cache.set(cacheKey, recommendations, 3600);

    return recommendations;
  }
}

module.exports = new RecommendationService();

