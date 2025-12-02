const { redisClient } = require('../config/redis');

/**
 * Cache Service - handles Redis caching operations
 * Gracefully falls back if Redis is unavailable
 */
class CacheService {
  /**
   * Check if Redis is available
   */
  isAvailable() {
    return redisClient.status === 'ready';
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Cached value or null
   */
  async get(key) {
    try {
      if (!this.isAvailable()) {
        return null;
      }
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Success status
   */
  async del(key) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys with pattern
   * @param {string} pattern - Key pattern (e.g., 'book:*')
   * @returns {Promise<boolean>} - Success status
   */
  async delPattern(pattern) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      const stream = redisClient.scanStream({
        match: pattern,
        count: 100,
      });

      const keys = [];
      stream.on('data', (resultKeys) => {
        keys.push(...resultKeys);
      });

      return new Promise((resolve) => {
        stream.on('end', async () => {
          if (keys.length > 0) {
            await redisClient.del(...keys);
          }
          resolve(true);
        });
      });
    } catch (error) {
      console.error(`Cache delete pattern error for ${pattern}:`, error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - Exists status
   */
  async exists(key) {
    try {
      if (!this.isAvailable()) {
        return false;
      }
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<Object>} - Object with key-value pairs
   */
  async mget(keys) {
    try {
      if (!this.isAvailable() || keys.length === 0) {
        return {};
      }
      const values = await redisClient.mget(...keys);
      const result = {};
      keys.forEach((key, index) => {
        if (values[index]) {
          try {
            result[key] = JSON.parse(values[index]);
          } catch {
            result[key] = values[index];
          }
        }
      });
      return result;
    } catch (error) {
      console.error(`Cache mget error:`, error.message);
      return {};
    }
  }

  /**
   * Set multiple key-value pairs at once
   * @param {Object} data - Object with key-value pairs
   * @param {number} ttlSeconds - Time to live in seconds
   * @returns {Promise<boolean>} - Success status
   */
  async mset(data, ttlSeconds = 3600) {
    try {
      if (!this.isAvailable() || Object.keys(data).length === 0) {
        return false;
      }
      const pipeline = redisClient.pipeline();
      Object.entries(data).forEach(([key, value]) => {
        pipeline.setex(key, ttlSeconds, JSON.stringify(value));
      });
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error(`Cache mset error:`, error.message);
      return false;
    }
  }
}

module.exports = new CacheService();

