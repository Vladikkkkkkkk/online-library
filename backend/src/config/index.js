require('dotenv').config();

const config = {
  // Server settings
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Open Library API
  openLibrary: {
    baseUrl: process.env.OPEN_LIBRARY_API_URL || 'https://openlibrary.org',
    coversUrl: 'https://covers.openlibrary.org',
  },
  
  // File upload settings
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 52428800, // 50MB
    uploadDir: process.env.UPLOAD_DIR || 'uploads/books',
    allowedFormats: ['pdf'], // Only PDF format allowed
  },
  
  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
};

module.exports = config;

