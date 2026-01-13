import { Client } from 'minio'

const bucket = process.env.S3_BUCKET || 'videos'

export const minio = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

export async function ensureBucket() {
  const exists = await minio.bucketExists(bucket)
  if (!exists) {
    await minio.makeBucket(bucket, 'us-east-1')
  }
}

export function bucketName() {
  return bucket
}
