import mongoose from 'mongoose';

export const BUCKETS = {
  resumeFiles: 'resumeFiles',
  agentArtifacts: 'agentArtifacts'
};

function getBucket(bucketName) {
  const { db } = mongoose.connection;
  if (!db) throw new Error('MongoDB is not connected.');
  return new mongoose.mongo.GridFSBucket(db, { bucketName });
}

export function uploadBuffer(bucketName, buffer, { filename, contentType, metadata = {} }) {
  return new Promise((resolve, reject) => {
    const stream = getBucket(bucketName).openUploadStream(filename, { metadata: { ...metadata, contentType } });
    stream.once('error', reject);
    stream.once('finish', () => resolve(stream.id));
    stream.end(buffer);
  });
}

export async function downloadBuffer(bucketName, fileId) {
  const chunks = [];
  for await (const chunk of getBucket(bucketName).openDownloadStream(new mongoose.Types.ObjectId(String(fileId)))) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export function openDownloadStream(bucketName, fileId) {
  return getBucket(bucketName).openDownloadStream(new mongoose.Types.ObjectId(String(fileId)));
}

export async function deleteFile(bucketName, fileId) {
  try {
    await getBucket(bucketName).delete(new mongoose.Types.ObjectId(String(fileId)));
    return true;
  } catch (err) {
    if (/FileNotFound|File not found/i.test(err?.message || '')) return false;
    throw err;
  }
}
