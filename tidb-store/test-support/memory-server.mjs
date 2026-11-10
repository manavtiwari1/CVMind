// Stand-in for mongodb-memory-server when tests run on TiDB: same API surface the tests use.
export class MongoMemoryServer {
  static async create() {
    return new MongoMemoryServer();
  }

  async start() {}

  getUri(dbName = 'test') {
    return `tidb-test://${dbName}`;
  }

  async stop() {
    return true;
  }
}

export class MongoMemoryReplSet extends MongoMemoryServer {}

export default { MongoMemoryServer, MongoMemoryReplSet };
