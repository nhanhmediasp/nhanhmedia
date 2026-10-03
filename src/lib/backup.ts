import { createHash } from 'crypto';
import { prisma } from '@/lib/db';

export const BACKUP_FORMAT = 'nhanh-media-backup';
export const BACKUP_VERSION = 1;

const TABLES_IN_CREATE_ORDER = [
  'user',
  'customer',
  'product',
  'productVariant',
  'productVariantPrice',
  'supplier',
  'projectCategory',
  'projectCustomer',
  'project',
  'taskColumn',
  'task',
  'websiteCost',
  'toolCost',
  'projectRequirementNote',
  'projectWorkLog',
  'telegramUpdate',
  'order',
  'orderRenewal',
  'emailSettings',
  'emailTemplate',
  'emailLog',
  'reminderSettings',
  'notification',
  'notificationRead',
  'auditLog',
  'websiteSettings',
  'loginAttempt',
  'paymentTransaction',
] as const;

type BackupTable = (typeof TABLES_IN_CREATE_ORDER)[number];
type TableData = Record<BackupTable, unknown[]>;

interface BackupPayload {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  source: {
    app: 'nhanh-media';
    database: 'postgresql';
  };
  tables: TableData;
  projectMembers: Array<{ projectId: string; userIds: string[] }>;
}

export interface BackupDocument extends BackupPayload {
  checksum: string;
}

function checksum(payload: BackupPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateBackupDocument(value: unknown): BackupDocument {
  if (!isObject(value)) throw new Error('File backup không phải JSON object hợp lệ.');
  if (value.format !== BACKUP_FORMAT || value.version !== BACKUP_VERSION) {
    throw new Error('File backup không đúng định dạng hoặc phiên bản chưa được hỗ trợ.');
  }
  if (typeof value.createdAt !== 'string' || !isObject(value.source) || !isObject(value.tables)) {
    throw new Error('File backup thiếu metadata bắt buộc.');
  }

  for (const table of TABLES_IN_CREATE_ORDER) {
    if (!Array.isArray(value.tables[table])) {
      throw new Error(`File backup thiếu bảng ${table}.`);
    }
  }
  if (!Array.isArray(value.projectMembers) || typeof value.checksum !== 'string') {
    throw new Error('File backup thiếu dữ liệu quan hệ hoặc checksum.');
  }

  const { checksum: receivedChecksum, ...payload } = value as unknown as BackupDocument;
  if (checksum(payload) !== receivedChecksum) {
    throw new Error('Checksum không khớp. File backup có thể đã bị sửa hoặc hỏng.');
  }

  const users = payload.tables.user as Array<Record<string, unknown>>;
  const hasUsableAdmin = users.some(
    (user) => user.role === 'admin' && user.status === 'active' && typeof user.passwordHash === 'string' && user.passwordHash.length > 0,
  );
  if (!hasUsableAdmin) {
    throw new Error('Backup không có tài khoản admin đang hoạt động với mật khẩu.');
  }

  return value as unknown as BackupDocument;
}

export async function createBackup(): Promise<BackupDocument> {
  const snapshot = await prisma.$transaction(async (tx) => {
    const client = tx as unknown as Record<string, { findMany: (args?: unknown) => Promise<unknown[]> }>;
    const tables = {} as TableData;

    for (const table of TABLES_IN_CREATE_ORDER) {
      if (table === 'project') continue;
      tables[table] = await client[table].findMany();
    }

    const projects = await tx.project.findMany({
      include: { members: { select: { id: true } } },
    });
    const projectMembers = projects.map((project) => ({
      projectId: project.id,
      userIds: project.members.map((member) => member.id),
    }));
    tables.project = projects.map(({ members, ...project }) => {
      void members;
      return project;
    });

    return { tables, projectMembers };
  }, { isolationLevel: 'RepeatableRead', timeout: 55_000 });

  const payload: BackupPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    source: { app: 'nhanh-media', database: 'postgresql' },
    ...snapshot,
  };

  return { ...payload, checksum: checksum(payload) };
}

export async function restoreBackup(document: BackupDocument): Promise<Record<string, number>> {
  const backup = validateBackupDocument(document);

  await prisma.$transaction(async (tx) => {
    const client = tx as unknown as Record<string, {
      deleteMany: (args?: unknown) => Promise<unknown>;
      createMany: (args: { data: unknown[] }) => Promise<unknown>;
    }>;

    for (const table of [...TABLES_IN_CREATE_ORDER].reverse()) {
      await client[table].deleteMany();
    }

    for (const table of TABLES_IN_CREATE_ORDER) {
      const rows = backup.tables[table];
      if (rows.length > 0) await client[table].createMany({ data: rows });
    }

    for (const relation of backup.projectMembers) {
      if (!isObject(relation) || typeof relation.projectId !== 'string' || !Array.isArray(relation.userIds)) {
        throw new Error('Dữ liệu thành viên dự án không hợp lệ.');
      }
      if (relation.userIds.length > 0) {
        await tx.project.update({
          where: { id: relation.projectId },
          data: { members: { connect: relation.userIds.map((id) => ({ id })) } },
        });
      }
    }
  }, { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 55_000 });

  return Object.fromEntries(
    TABLES_IN_CREATE_ORDER.map((table) => [table, backup.tables[table].length]),
  );
}

export function getBackupRecordCount(document: BackupDocument): number {
  return TABLES_IN_CREATE_ORDER.reduce((total, table) => total + document.tables[table].length, 0);
}
