import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Team files live in a private Cloudflare R2 bucket. The browser uploads and downloads with
// short-lived presigned URLs, so file bytes never pass through the API server.

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
// Meeting recordings, made in the host's browser (WebM in Chrome and Edge, MP4 in Safari)
export const MAX_RECORDING_BYTES = 1024 * 1024 * 1024;
export const RECORDING_TYPES = { 'video/webm': ['webm'], 'video/mp4': ['mp4'] };
const URL_TTL_SECONDS = 5 * 60;

// mime → extensions it may have
export const FILE_TYPES = {
  'application/pdf': ['pdf'],
  'text/plain': ['txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp']
};
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
// Opened in the browser tab; anything else (docx) downloads
const INLINE_TYPES = ['application/pdf', 'text/plain', ...IMAGE_TYPES, ...Object.keys(RECORDING_TYPES)];

export function fileTypeError(name, mime) {
  const ext = String(name).split('.').pop().toLowerCase();
  const allowed = FILE_TYPES[mime];
  if (!allowed || !allowed.includes(ext)) return 'Only PDF, TXT, DOCX, PNG and JPG files are allowed.';
  return '';
}

function r2Driver() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY }
  });
  const Bucket = R2_BUCKET;
  return {
    presignPut: (key, mime) => getSignedUrl(client, new PutObjectCommand({ Bucket, Key: key, ContentType: mime }), { expiresIn: URL_TTL_SECONDS }),
    presignGet: (key, { name, mime, download }) => {
      const disposition = `${download || !INLINE_TYPES.includes(mime) ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`;
      return getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key, ResponseContentDisposition: disposition, ResponseContentType: mime }), { expiresIn: URL_TTL_SECONDS });
    },
    head: async (key) => {
      try {
        const out = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return { size: out.ContentLength, mime: out.ContentType };
      } catch (err) {
        if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return null;
        throw err;
      }
    },
    remove: (key) => client.send(new DeleteObjectCommand({ Bucket, Key: key }))
  };
}

let driver;
const getDriver = () => (driver === undefined ? (driver = r2Driver()) : driver);

export const storageConfigured = () => !!getDriver();

// Tests swap in a fake { presignPut, presignGet, head, remove }
export function setStorageDriver(fake) {
  driver = fake;
}

function need() {
  const d = getDriver();
  if (!d) throw Object.assign(new Error('File uploads are not set up on this server yet (Cloudflare R2). Ask an admin to add the R2 keys.'), { status: 503, expose: true });
  return d;
}

export const presignUpload = (key, mime) => need().presignPut(key, mime);
export const presignDownload = (file, download = false) => need().presignGet(file.key, { name: file.name, mime: file.mime, download });
export const headObject = (key) => need().head(key);
export const removeObject = (key) => need().remove(key);
