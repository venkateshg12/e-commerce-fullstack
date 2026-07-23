import "dotenv/config";


import { emailWorker } from './jobs/workers/email.worker';

console.log('🚀 Background Worker Process Initialized');



// Graceful Shutdown Handler
const shutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Closing background workers gracefully...`);
  await emailWorker.close();
  console.log('Background worker shutdown complete.');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
