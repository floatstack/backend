import express from 'express';
import type { Express } from 'express';
import type { Request, Response, NextFunction } from "express";
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import { debugSwaggerFiles } from './config/swagger-debug.js';
import routes from './routes/index.js';
import { errorResponse } from './utils/response.js';
import { initScheduler } from './utils/initScheduler.js';


const app: Express = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec.v1, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      cacheControl: false,
      docExpansion: 'none',
      deepLinking: true,
      defaultModelsExpandDepth: -1,
      onComplete: () => {
        // Remove all Swagger UI stored cache when UI finishes loading
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('swagger_authorization');
          window.sessionStorage.clear();
        }
      },
    },
    customCss: '.swagger-ui .topbar { display: none }',
  })
);


debugSwaggerFiles();

// Optional: Serve raw swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec.v1);
});


app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});


app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to floatstack API!',
    documentation: '/api-docs',
    version: 'v1.0.0'
  });
});



app.use(routes);


app.use((req, res) => {
  return res.status(404).json(
    errorResponse(404, "Not Found", [
      `The endpoint ${req.originalUrl} does not exist`,
    ])
  );
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);

  return res.status(err.statusCode || 500).json(
    errorResponse(
      err.statusCode || 500,
      err.message || "Internal Server Error",
      err.errors || ["Something went wrong, please try again later."]
    )
  );
});

// Initialize cron jobs
initScheduler();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});

export default app;