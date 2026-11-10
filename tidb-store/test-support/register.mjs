// Loaded with `node --import` when TEST_DATABASE=tidb (see backend/scripts/test.mjs).
// Makes the existing test suites run on the TiDB test database without changing them:
//  - `mongodb-memory-server` resolves to a stand-in whose URI is tidb-test://
//  - mongoose.connect('tidb-test://...') connects to the TiDB test database and empties it,
//    so every test file starts clean, like it did with a fresh in-memory MongoDB.
import { register } from 'module';
import mongoose from 'mongoose';
import { connectTidb } from '../src/index.js';
import { testDatabaseUrl } from '../scripts/setup-test-db.mjs';

register(new URL('./hooks.mjs', import.meta.url));

process.env.DATABASE_DRIVER = 'tidb';
process.env.TIDB_DATABASE_URL = testDatabaseUrl();
// the first connection in each test process empties the test database, whichever way it connects
process.env.TIDB_TEST_WIPE_ON_CONNECT = '1';

const originalConnect = mongoose.connect.bind(mongoose);
mongoose.connect = async function connect(uri, options) {
  if (typeof uri === 'string' && uri.startsWith('tidb-test://')) {
    const { db } = await connectTidb(mongoose);
    await db.dropDatabase();
    return mongoose;
  }
  return originalConnect(uri, options);
};
