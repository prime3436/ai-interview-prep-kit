import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { storage } from './storage.js';
import { authRouter, kitsRouter, practiceRouter, mockInterviewRouter, batchRouter } from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AI Interview Prep Kit API (Trao FS-AI-INTERVIEW-01)',
    status: 'online',
    frontend: 'http://localhost:3000',
    documentation: 'See README.md for full specification',
    endpoints: {
      health: '/api/health',
      kits: '/api/kits',
      auth: '/api/auth',
      practice: '/api/practice',
      mockInterview: '/api/mock-interview',
      batch: '/api/batch',
    },
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-interview-prep-kit-api',
  });
});

// Mount modular routers
app.use('/api/auth', authRouter);
app.use('/api/kits', kitsRouter);
app.use('/api/practice', practiceRouter);
app.use('/api/mock-interview', mockInterviewRouter);
app.use('/api/batch', batchRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ServerError]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

async function startServer() {
  await storage.init();
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 AI Interview Prep Kit Backend running on port ${PORT}`);
    console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`====================================================`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
