import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client, getR2BucketName, getR2PublicUrl } from '@/lib/r2-client'

const SIGNED_URL_EXPIRY = 3600 // 1 hour

export async function uploadToR2(
  key: string,
  body: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  const client = getR2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
      Body: body instanceof ArrayBuffer ? Buffer.from(body) : body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )
  return key
}

export async function generateR2SignedUrl(key: string): Promise<string> {
  const client = getR2Client()
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: key }),
    { expiresIn: SIGNED_URL_EXPIRY }
  )
}

export function getR2FilePublicUrl(key: string): string {
  return `${getR2PublicUrl()}/${key}`
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client()
  await client.send(
    new DeleteObjectCommand({ Bucket: getR2BucketName(), Key: key })
  )
}
