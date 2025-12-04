const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const config = require('./config');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');


const app = express();


connectDB();


connectRedis();


app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));


app.use('/api', routes);


app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Online Library API Documentation',
}));


app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Online Library API',
    version: '1.0.0',
    docs: '/api/health',
  });
});


app.use(notFoundHandler);
app.use(errorHandler);


const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`
  🚀 Server running in ${config.nodeEnv} mode
  📚 Online Library API
  🌐 http://localhost:${PORT}
  📖 API Health: http://localhost:${PORT}/api/health
  📘 Swagger Docs: http://localhost:${PORT}/api-docs
  `);
});


process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;

