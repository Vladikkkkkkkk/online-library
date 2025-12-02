const { prisma } = require('../config/database');
const openLibraryService = require('./openLibraryService');
const bookService = require('./bookService');
const cache = require('../utils/cache');
const config = require('../config');
const axios = require('axios');

/**
 * Recommendation Service - Content-based filtering
 * Recommends books based on user's saved books and high-rated books
 */
class RecommendationService {
  /**
   * Get user's preferred subjects/categories from their activity
   * @param {string} userId - User ID
   * @returns {Promise<Object>} - Map of subjects with weights
   */
  async getUserPreferences(userId) {
    // Get user's saved books
    const savedBooks = await prisma.savedBook.findMany({
      where: { userId },
      select: { openLibraryId: true },
    });

    // Get user's reviews with high ratings (4-5)
    const highRatedReviews = await prisma.review.findMany({
      where: {
        userId,
        rating: { gte: 4 }, // Rating 4 or 5
      },
      select: { openLibraryId: true, rating: true },
    });

    // Combine all book IDs (limit to 20 most recent to avoid too many API calls)
    const allBookIds = [
      ...savedBooks.slice(0, 15).map(sb => sb.openLibraryId), // Limit saved books
      ...highRatedReviews.map(r => r.openLibraryId),
    ];
    
    // Remove duplicates
    const bookIds = [...new Set(allBookIds)];

    if (bookIds.length === 0) {
      return {}; // No preferences yet
    }

    // Get subjects from these books
    const subjectsMap = {};
    const ratingMap = {};
    
    // Create rating map for weighted preferences
    highRatedReviews.forEach(review => {
      ratingMap[review.openLibraryId] = review.rating;
    });

    // Check cache first for all books
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
    
    // Batch fetch missing books using search API (much faster than individual requests)
    const fetchedBooksMap = {};
    if (uncachedBookIds.length > 0) {
      try {
        // Use batch search with keys to fetch multiple books at once
        const keys = uncachedBookIds.map(id => `key:/works/${id}`).join(' OR ');
        const batchResponse = await axios.get(
          `${config.openLibrary.baseUrl}/search.json?q=(${keys})&fields=key,title,subject,ratings_average,ratings_count&limit=${uncachedBookIds.length}`,
          { timeout: 10000 } // 10 second timeout for batch request
        );
        
        if (batchResponse.data.docs) {
          for (const doc of batchResponse.data.docs) {
            const id = doc.key?.replace('/works/', '');
            if (id && uncachedBookIds.includes(id)) {
              fetchedBooksMap[id] = {
                subjects: doc.subject?.slice(0, 10) || [], // Limit subjects to 10
              };
              
              // Cache the basic book data
              await cache.set(`book:${id}`, {
                ...fetchedBooksMap[id],
                title: doc.title,
                openLibraryRating: doc.ratings_average ? Number(doc.ratings_average) : null,
                openLibraryRatingCount: doc.ratings_count || 0,
              }, 1800); // 30 minutes
            }
          }
        }
      } catch (batchError) {
        console.error('Batch fetch error in recommendations:', batchError.message);
      }
    }
    
    // Combine cached and fetched data
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

    // Build subjects map with weights
    // Higher rating = higher weight
    bookDetails.forEach(({ subjects, rating }) => {
      if (!subjects || subjects.length === 0) return;
      
      const weight = rating / 5; // Normalize to 0-1
      subjects.forEach(subject => {
        const normalizedSubject = subject.toLowerCase().trim();
        if (normalizedSubject) {
          subjectsMap[normalizedSubject] = (subjectsMap[normalizedSubject] || 0) + weight;
        }
      });
    });

    return subjectsMap;
  }

  /**
   * Find books similar to user's preferences
   * @param {Object} preferences - User's subject preferences with weights
   * @param {string} userId - User ID to exclude user's books
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} - Recommended books
   */
  async findSimilarBooks(preferences, userId, limit = 10) {
    if (Object.keys(preferences).length === 0) {
      // No preferences - return trending books as fallback
      return this.getFallbackRecommendations(limit);
    }

    // Get user's existing books to exclude (check cache first)
    const excludedBooksCacheKey = `excluded_books:${userId}`;
    let userBookIds = new Set();
    
    const cachedExcluded = await cache.get(excludedBooksCacheKey);
    if (cachedExcluded) {
      cachedExcluded.forEach(id => userBookIds.add(id));
    } else {
      // Get user's saved books
      const userBooks = await prisma.savedBook.findMany({
        where: { userId },
        select: { openLibraryId: true },
      });
      userBooks.forEach(sb => userBookIds.add(sb.openLibraryId));
      
      // Also exclude books user has reviewed
      const userReviews = await prisma.review.findMany({
        where: { userId },
        select: { openLibraryId: true },
      });
      userReviews.forEach(r => userBookIds.add(r.openLibraryId));
      
      // Cache excluded books for 30 minutes
      const excludedIds = Array.from(userBookIds);
      await cache.set(excludedBooksCacheKey, excludedIds, 1800);
    }

    // Get top preferred subjects (top 3 to reduce API calls)
    const topSubjects = Object.entries(preferences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([subject]) => subject);

    // Search for books with these subjects
    // Use Open Library search with subject filter
    const recommendations = new Map(); // Use Map to avoid duplicates

    // Search for each top subject with timeout
    for (const subject of topSubjects) {
      try {
        // Use subject as query and also as subject filter for better results
        // Limit to 3 subjects to reduce API calls
        const results = await Promise.race([
          openLibraryService.searchBooks(null, {
            page: 1,
            limit: 15, // Reduced from 20
            subject: subject,
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          ),
        ]);

        if (results && results.books && results.books.length > 0) {
          // Score each book based on subject overlap
          results.books.forEach(book => {
            if (userBookIds.has(book.openLibraryId)) {
              return; // Skip user's books
            }

            if (!recommendations.has(book.openLibraryId)) {
              // Calculate similarity score
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
        // Continue with other subjects if one fails
        console.warn(`Error searching for subject ${subject}:`, error.message);
      }
    }

    // Sort by score and get top recommendations
    const sortedRecommendations = Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.book);

    // If we don't have enough recommendations, add trending books
    if (sortedRecommendations.length < limit) {
      const fallback = await this.getFallbackRecommendations(limit - sortedRecommendations.length);
      const fallbackIds = new Set(sortedRecommendations.map(b => b.openLibraryId));
      const uniqueFallback = fallback.filter(b => 
        !userBookIds.has(b.openLibraryId) && !fallbackIds.has(b.openLibraryId)
      );
      sortedRecommendations.push(...uniqueFallback);
    }

    // Get combined ratings for recommended books
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

  /**
   * Calculate similarity score between a book and user preferences
   * @param {Object} book - Book object with subjects
   * @param {Object} preferences - User's subject preferences
   * @returns {number} - Similarity score (0-1)
   */
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

    // Normalize score
    const normalizedScore = score / totalWeight;

    // Boost score if book has high rating
    const ratingBoost = book.openLibraryRating 
      ? (book.openLibraryRating / 5) * 0.3 // Up to 30% boost
      : 0;

    return Math.min(1, normalizedScore + ratingBoost);
  }

  /**
   * Get fallback recommendations (trending books)
   * @param {number} limit - Number of books
   * @returns {Promise<Array>} - Trending books
   */
  async getFallbackRecommendations(limit) {
    try {
      return await bookService.getTrendingBooks('weekly', limit);
    } catch (error) {
      console.error('Error getting fallback recommendations:', error.message);
      return [];
    }
  }

  /**
   * Get recommendations for a user
   * @param {string} userId - User ID
   * @param {number} limit - Number of recommendations
   * @returns {Promise<Array>} - Recommended books
   */
  async getRecommendations(userId, limit = 10) {
    // Check cache first
    const cacheKey = `recommendations:${userId}:${limit}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check cache for user preferences (cache separately for faster access)
    const preferencesCacheKey = `user_preferences:${userId}`;
    let preferences = await cache.get(preferencesCacheKey);
    
    if (!preferences) {
      // Get user preferences
      preferences = await this.getUserPreferences(userId);
      // Cache preferences for 2 hours (preferences don't change that often)
      await cache.set(preferencesCacheKey, preferences, 7200);
    }

    // Find similar books
    const recommendations = await this.findSimilarBooks(preferences, userId, limit);

    // Cache recommendations for 1 hour
    await cache.set(cacheKey, recommendations, 3600);

    return recommendations;
  }
}

module.exports = new RecommendationService();

