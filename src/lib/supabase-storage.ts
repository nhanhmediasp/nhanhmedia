import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_MEDIA_BUCKET = 'media';
const DEFAULT_MEDIA_PREFIX = 'uploads';

type StorageConfig = {
  client: SupabaseClient;
  bucket: string;
  prefix: string;
};

let cachedConfig: StorageConfig | null = null;
let bucketReady: Promise<void> | null = null;

function cleanSegment(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

export function getStorageConfig(): StorageConfig {
  if (cachedConfig) return cachedConfig;

  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Configure Supabase Storage in the environment.',
    );
  }

  cachedConfig = {
    client: createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    bucket: cleanSegment(process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_MEDIA_BUCKET),
    prefix: cleanSegment(process.env.SUPABASE_STORAGE_PREFIX || DEFAULT_MEDIA_PREFIX),
  };

  return cachedConfig;
}

export async function ensureMediaBucket(): Promise<void> {
  if (bucketReady) return bucketReady;

  bucketReady = (async () => {
    const { client, bucket } = getStorageConfig();
    const { data, error } = await client.storage.getBucket(bucket);
    if (data && !error) return;

    const { error: createError } = await client.storage.createBucket(bucket, {
      public: true,
      // Old aaPanel uploads may be as large as 5MB; new web uploads stay at 2MB.
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: [
        'image/png', 'image/jpeg', 'image/gif', 'image/webp',
        'image/x-icon', 'image/vnd.microsoft.icon',
      ],
    });

    // A concurrent cold start may have created the bucket first.
    if (createError && !/already exists|duplicate/i.test(createError.message)) {
      throw new Error(`Cannot create Supabase Storage bucket "${bucket}": ${createError.message}`);
    }
  })().catch((error) => {
    bucketReady = null;
    throw error;
  });

  return bucketReady;
}

export function mediaObjectPath(fileName: string): string {
  const { prefix } = getStorageConfig();
  return prefix ? `${prefix}/${fileName}` : fileName;
}

export function mediaAppUrl(fileName: string): string {
  return `/uploads/${fileName.split('/').map(encodeURIComponent).join('/')}`;
}

export function mediaPublicUrl(fileName: string): string {
  const { client, bucket } = getStorageConfig();
  return client.storage.from(bucket).getPublicUrl(mediaObjectPath(fileName)).data.publicUrl;
}
