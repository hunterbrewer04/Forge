import 'server-only'
import { S3Client } from '@aws-sdk/client-s3'

let r2Client: S3Client | null = null

export function getR2Client(): S3Client {
  if (r2Client) return r2Client

  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing R2 configuration. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY'
    )
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  return r2Client
}

export function getR2BucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('R2_BUCKET_NAME is not configured')
  return bucket
}

export function getR2PublicUrl(): string {
  const url = process.env.R2_PUBLIC_URL
  if (!url) throw new Error('R2_PUBLIC_URL is not configured')
  return url
}
