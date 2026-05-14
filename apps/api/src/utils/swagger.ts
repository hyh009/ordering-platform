import { env } from '@src/config/env.js';
import { logger } from '@src/utils/logger.js';
import { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Express server',
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}/api`,
        description: 'Development server',
      },
    ],
  },
  // Path to the API docs
  apis: ['./src/routes/**/*.ts', './src/app.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  // Swagger Page
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Docs in JSON format
  app.get('/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  logger.info(
    { url: `http://localhost:${env.PORT}/docs` },
    'swagger docs ready',
  );
}
