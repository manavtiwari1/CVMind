// Read-only MongoDB access for the migration. Only listCollections, countDocuments, estimatedDocumentCount
// and find are ever called. Nothing in db-migration writes to, updates or deletes from MongoDB.
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '..', '..', 'backend', '.env') });

export async function openMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in backend/.env');
  const conn = await mongoose.createConnection(uri, {
    appName: 'cvmind-migration-readonly',
    maxPoolSize: 2,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 15000,
    readPreference: 'secondaryPreferred'
  }).asPromise();
  const db = conn.db;
  return {
    async listCollections() {
      const list = await db.listCollections({}, { nameOnly: true }).toArray();
      return list.map((c) => c.name).filter((n) => !n.startsWith('system.')).sort();
    },
    count: (name) => db.collection(name).countDocuments({}),
    find: (name, batchSize = 500) => db.collection(name).find({}, { batchSize }).sort({ _id: 1 }),
    close: () => conn.close()
  };
}
