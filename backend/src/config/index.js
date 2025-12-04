require('dotenv').config();

const config = {

  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',


  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },


  openLibrary: {
    baseUrl: process.env.OPEN_LIBRARY_API_URL || 'https://openlibrary.org',
    coversUrl: 'https://covers.openlibrary.org',
  },


  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 52428800, 
    uploadDir: process.env.UPLOAD_DIR || 'uploads/books',
    allowedFormats: ['pdf'], 
  },


  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },


  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: {
      bookRatings: 3600,      
      bookSearch: 300,        
      trendingBooks: 1800,    
      bookDetails: 1800,      
      bookReviews: 600,       
      combinedRatings: 3600,  
    },
  },
};

module.exports = config;

