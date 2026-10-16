import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const sourceDir = resolve(process.argv[2] || 'public/uploads');
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const bucket = (process.env.SUPABASE_STORAGE_BUCKET || 'media').replace(/^\/+|\/+$/g, '');
const prefix = (process.env.SUPABASE_STORAGE_PREFIX || 'uploads').replace(/^\/+|\/+$/g, '');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
}

const sourceStats = await stat(sourceDir).catch(() => null);
if (!sourceStats?.isDirectory()) throw new Error(`Upload directory not found: ${sourceDir}`);

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existingBucket } = await client.storage.getBucket(bucket);
if (!existingBucket) {
  const { error } = await client.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: [
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'image/x-icon', 'image/vnd.microsoft.icon',
    ],
  });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return entry.isFile() && !entry.name.startsWith('.') ? [fullPath] : [];
  }));
  return nested.flat();
}

function contentType(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ({
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', ico: 'image/x-icon',
  })[ext] || 'application/octet-stream';
}

const files = await collectFiles(sourceDir);
let completed = 0;

for (const fullPath of files) {
  const relativePath = relative(sourceDir, fullPath).split(sep).join('/');
  const objectPath = prefix ? `${prefix}/${relativePath}` : relativePath;
  const body = await readFile(fullPath);
  const { error } = await client.storage.from(bucket).upload(objectPath, body, {
    contentType: contentType(relativePath),
    cacheControl: '31536000',
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${relativePath}: ${error.message}`);
  completed += 1;
  console.log(`[${completed}/${files.length}] ${relativePath}`);
}

console.log(`Migrated ${completed} file(s) from ${sourceDir} to ${bucket}/${prefix}.`);
