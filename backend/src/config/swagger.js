const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Online Library API',
      version: '1.0.0',
      description: 'API documentation for Online Library application - Books, Reviews, Playlists, and Recommendations',
      contact: {
        name: 'API Support',
        email: 'support@onlinelibrary.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from login endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Books', description: 'Book search and details from Open Library' },
      { name: 'Library', description: 'User personal library management' },
      { name: 'Reviews', description: 'Book reviews and ratings' },
      { name: 'Playlists', description: 'User playlists management' },
      { name: 'Recommendations', description: 'Book recommendations based on user preferences' },
      { name: 'Admin', description: 'Admin panel endpoints' },
    ],
  },
  apis: ['./src/routes/*.js'], // Paths to files containing OpenAPI definitions
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

