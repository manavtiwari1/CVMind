import { Readable } from 'stream';

// A small stand-in for the MongoDB driver's FindCursor / AggregationCursor.
// Supports the chain methods the app and Mongoose use; results are loaded on first read.
export class SqlCursor {
  constructor(load, options = {}) {
    this._load = load;
    this._opts = { ...options };
    this._docs = null;
    this._i = 0;
    this._maps = [];
    this.closed = false;
  }

  sort(sort, direction) {
    this._opts.sort = typeof sort === 'string' && direction !== undefined ? { [sort]: direction } : sort;
    return this;
  }
  limit(n) { this._opts.limit = n; return this; }
  skip(n) { this._opts.skip = n; return this; }
  project(p) { this._opts.projection = p; return this; }
  map(fn) { this._maps.push(fn); return this; }
  batchSize() { return this; }
  maxTimeMS() { return this; }
  hint() { return this; }
  collation() { return this; }
  comment() { return this; }
  allowDiskUse() { return this; }
  addCursorFlag() { return this; }
  withReadPreference() { return this; }

  async _all() {
    if (!this._docs) {
      let docs = await this._load(this._opts);
      for (const fn of this._maps) docs = docs.map(fn);
      this._docs = docs;
    }
    return this._docs;
  }

  async toArray() {
    const docs = await this._all();
    const out = docs.slice(this._i);
    this._i = docs.length;
    return out;
  }
  async next() {
    const docs = await this._all();
    return this._i < docs.length ? docs[this._i++] : null;
  }
  async tryNext() { return this.next(); }
  async hasNext() {
    const docs = await this._all();
    return this._i < docs.length;
  }
  async forEach(fn) {
    for (let d = await this.next(); d !== null; d = await this.next()) {
      if ((await fn(d)) === false) break;
    }
  }
  async count() { return (await this._all()).length; }
  async explain() { return { tidb: true, options: this._opts }; }
  rewind() { this._i = 0; return this; }
  async close() { this.closed = true; }
  clone() { return new SqlCursor(this._load, this._opts); }

  async *[Symbol.asyncIterator]() {
    for (let d = await this.next(); d !== null; d = await this.next()) yield d;
  }

  stream() {
    return Readable.from(this);
  }
}
