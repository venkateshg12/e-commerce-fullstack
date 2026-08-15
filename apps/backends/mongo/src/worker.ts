import "dotenv/config";
import { connectDB } from "./config/db";
import { emailWorker } from './jobs/workers/email.worker';
import { imageWorker } from './jobs/workers/image.worker';

async function startWorker() {
  await connectDB();
  console.log('🚀 Background Worker Process Initialized (Email & Image Workers Active)');
}

startWorker().catch((err) => {
  console.error('Failed to start worker process:', err);
  process.exit(1);
});

// Graceful Shutdown Handler
const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Closing background workers gracefully...`);
  await Promise.all([
    emailWorker.close(),
    imageWorker.close(),
  ]);
  console.log('Background worker shutdown complete.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

