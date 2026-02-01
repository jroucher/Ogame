import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { router } from './api/routes.js';
import { browserManager } from './browser/browser-manager.js';
import { taskScheduler } from './scheduler/task-scheduler.js';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api', router);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = app.listen(config.server.port, () => {
  console.log(`🚀 OGame Bot API running on http://localhost:${config.server.port}`);
  console.log('⏰ TaskScheduler iniciado automáticamente');
  taskScheduler.start();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando bot...');
  taskScheduler.stop();
  await browserManager.close();
  server.close();
  process.exit(0);
});
