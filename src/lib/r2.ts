import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 is S3-compatible, so we use the AWS S3 SDK pointed at the R2
 * endpoint. Env vars (set these in .env + Vercel):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 */
const accountId = process.env.R2_ACCOUNT_ID ?? "";
export const R2_BUCKET = process.env.R2_BUCKET ?? "";

export const r2Configured = () =>
  Boolean(accountId && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && R2_BUCKET);

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

// A short-lived URL the browser PUTs the file straight to (keeps big videos off
// the Vercel function, which caps request bodies at ~4.5 MB).
export function presignUpload(key: string, contentType: string) {
  return getSignedUrl(r2, new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }), {
    expiresIn: 600, // 10 min to finish the upload
  });
}

// A short-lived URL to stream/download a private object for playback.
export function presignDownload(key: string) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }), {
    expiresIn: 3600, // 1 hour
  });
}
