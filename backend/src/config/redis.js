const Redis = require('ioredis');
require('dotenv').config();


const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    if (times > 10) {
      console.error('❌ Redis: Too many reconnection attempts');
      return null; 
    }
    return Math.min(times * 100, 3000);
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true, 
});


redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err.message);
});

redisClient.on('connect', () => {
  console.log('🔄 Redis: Connecting...');
});

redisClient.on('ready', () => {
  console.log('✅ Redis: Connected successfully');
});

redisClient.on('close', () => {
  console.log('🔌 Redis: Connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...');
});


const connectRedis = async () => {
  try {
    if (redisClient.status !== 'ready') {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.warn('⚠️  Server will continue without Redis cache');

  }
};


const disconnectRedis = async () => {
  try {
    if (redisClient.status !== 'ready') {
      return;
    }
    await redisClient.quit();
    console.log('Redis disconnected');
  } catch (error) {
    console.error('Redis disconnect error:', error.message);
  }
};


process.on('SIGINT', async () => {
  await disconnectRedis();
});

process.on('SIGTERM', async () => {
  await disconnectRedis();
});

module.exports = { redisClient, connectRedis, disconnectRedis };

