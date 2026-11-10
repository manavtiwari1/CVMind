// GridFS-compatible file storage on TiDB: <bucket>.files and <bucket>.chunks tables, same document layout as MongoDB.
import { Readable, Writable } from 'stream';
import mongoose from 'mongoose';

const { ObjectId } = mongoose.mongo.BSON;
const CHUNK_SIZE = 255 * 1024;

function notFound(id) {
  const err = new Error(`FileNotFound: file ${id} was not found`);
  err.code = 'ENOENT';
  return err;
}

export class TidbGridFSBucket {
  constructor(db, { bucketName = 'fs', chunkSizeBytes = CHUNK_SIZE } = {}) {
    this.files = db.collection(`${bucketName}.files`);
    this.chunks = db.collection(`${bucketName}.chunks`);
    this.chunkSize = chunkSizeBytes;
  }

  openUploadStream(filename, { metadata, id } = {}) {
    const fileId = id ?? new ObjectId();
    const parts = [];
    const bucket = this;
    const stream = new Writable({
      write(chunk, _enc, cb) { parts.push(Buffer.from(chunk)); cb(); },
      final(cb) {
        const data = Buffer.concat(parts);
        bucket._store(fileId, filename, metadata, data).then(() => cb(), cb);
      }
    });
    stream.id = fileId;
    return stream;
  }

  async _store(fileId, filename, metadata, data) {
    for (let n = 0; n * this.chunkSize < data.length; n++) {
      const off = n * this.chunkSize;
      await this.chunks.insertOne({ _id: new ObjectId(), files_id: fileId, n, data: data.subarray(off, off + this.chunkSize) });
    }
    const doc = { _id: fileId, length: data.length, chunkSize: this.chunkSize, uploadDate: new Date(), filename };
    if (metadata !== undefined) doc.metadata = metadata;
    await this.files.insertOne(doc);
  }

  openDownloadStream(id) {
    const bucket = this;
    async function* read() {
      const file = await bucket.files.findOne({ _id: id });
      if (!file) throw notFound(id);
      const chunks = await bucket.chunks.find({ files_id: id }, { sort: { n: 1 } }).toArray();
      for (const c of chunks) {
        const data = c.data;
        yield Buffer.isBuffer(data) ? data : Buffer.from(data.buffer ?? data);
      }
    }
    return Readable.from(read());
  }

  async delete(id) {
    const r = await this.files.deleteOne({ _id: id });
    await this.chunks.deleteMany({ files_id: id });
    if (!r.deletedCount) throw notFound(id);
  }

  find(filter = {}, options = {}) {
    return this.files.find(filter, options);
  }
}
