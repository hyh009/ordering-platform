import { corsOptions } from '@src/config/cors';
import { passport } from '@src/config/passport';
import { errorHandler } from '@src/middlewares/error';
import { requestId } from '@src/middlewares/requestId';
import { requestLogger } from '@src/middlewares/requestLogger';
import routes from '@src/routes';
import { RouteNotFoundError } from '@src/utils/errors';
import { setupSwagger } from '@src/utils/swagger';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

export function createApp() {
  const app = express();

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(passport.initialize());

  setupSwagger(app);

  app.use('/api', routes);

  // 404 Handler
  app.use((req, res, next) => {
    next(
      new RouteNotFoundError(`Can't find ${req.originalUrl} on this server!`),
    );
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
