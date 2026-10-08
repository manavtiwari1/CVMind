import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Tests always use a throwaway in-memory MongoDB, never the MONGODB_URI from .env
export async function startTestMongo(models = []) {
  // Cold mongod starts can exceed the 10s default, especially on Intel Macs
  const server = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
  await mongoose.connect(server.getUri());
  await Promise.all(models.map((model) => model.syncIndexes()));
  return {
    reset: () => Promise.all(models.map((model) => model.deleteMany({}))),
    stop: async () => {
      await mongoose.disconnect();
      await server.stop();
    }
  };
}
