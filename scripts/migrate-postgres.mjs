import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const confirmed = process.argv.includes('--confirm-target-overwrite');
const sourceUrl = process.env.SOURCE_DATABASE_URL?.trim();
const targetUrl = process.env.DIRECT_URL?.trim();

if (!confirmed) {
  throw new Error('This replaces matching objects in the target public schema. Re-run with --confirm-target-overwrite.');
}
if (!sourceUrl || !targetUrl) {
  throw new Error('Set SOURCE_DATABASE_URL (aaPanel) and DIRECT_URL (Supabase session/direct connection).');
}
if (sourceUrl === targetUrl) throw new Error('Source and target database URLs must be different.');

function pgEnvironment(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Only PostgreSQL URLs are supported.');
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.replace(/^\//, '')),
    PGSSLMODE: url.searchParams.get('sslmode') || 'prefer',
  };
}

function run(command, args, env) {
  const result = spawnSync(command, args, { env, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`);
}

for (const command of ['pg_dump', 'pg_restore']) {
  const probe = spawnSync(command, ['--version'], { stdio: 'ignore', shell: false });
  if (probe.error || probe.status !== 0) throw new Error(`${command} is not installed or is not in PATH.`);
}

const backupDir = resolve('migration-backups');
await mkdir(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dumpFile = resolve(backupDir, `aapanel-${stamp}.dump`);

console.log(`Creating a safety dump at ${dumpFile}`);
run('pg_dump', [
  '--format=custom', '--schema=public', '--no-owner', '--no-privileges',
  `--file=${dumpFile}`,
], pgEnvironment(sourceUrl));

const target = new URL(targetUrl);
const targetDatabase = decodeURIComponent(target.pathname.replace(/^\//, ''));
console.log(`Restoring public schema into ${target.hostname}/${targetDatabase}`);
run('pg_restore', [
  `--dbname=${targetDatabase}`, '--clean', '--if-exists', '--no-owner', '--no-privileges',
  '--exit-on-error', dumpFile,
], pgEnvironment(targetUrl));

console.log('Database migration complete. Keep the dump until the Vercel deployment has been verified.');
