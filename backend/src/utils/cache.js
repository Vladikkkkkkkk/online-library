const { redisClient } = require('../config/redis');


class CacheService {

  isAvailable() {
    return redisClient.status === 'ready';
  }


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

