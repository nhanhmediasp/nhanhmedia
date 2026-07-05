import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken, TOKEN_COOKIE_NAME, UserSessionPayload } from '@/lib/auth';
import { cookies } from 'next/headers';

const SENSITIVE_FIELDS = [
  'password', 'passwordhash', 'password_hash', 'passwordHash',
  'smtppassword', 'smtp_password', 'smtpPassword', 'smtpPasswordEncrypted',
  'token', 'refreshtoken', 'refresh_token', 'refreshToken',
  'accesstoken', 'access_token', 'accessToken',
  'secret', 'apikey', 'api_key', 'apiKey'
];

function maskSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item));
  }
  
  if (typeof data === 'object') {
    const masked: any = {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        masked[key] = '********';
      } else {
        masked[key] = maskSensitiveData(data[key]);
      }
    }
    return masked;
  }
  
  return data;
}

function getChangedFields(oldVal: any, newVal: any): string[] {
  const changed: string[] = [];
  if (!oldVal || !newVal || typeof oldVal !== 'object' || typeof newVal !== 'object') {
    return changed;
  }
  
  const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);
  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'updated_at') continue;
    
    const valA = oldVal[key];
    const valB = newVal[key];
    
    if (JSON.stringify(valA) !== JSON.stringify(valB)) {
      changed.push(key);
    }
  }
  return changed;
}

export interface AuditLogOptions {
  actor?: { id: string; name: string; email: string; role: string } | null;
  action: string;
  actionLabel: string;
  module: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  description: string;
  oldValues?: any;
  newValues?: any;
  request?: NextRequest | Request | null;
  status?: 'success' | 'failed';
  errorMessage?: string;
}

function decodeHeaderValue(val: string | null): string {
  if (!val) return '';
  try {
    // If it was URI encoded (contains % followed by hex)
    if (/%[0-9a-fA-F]{2}/.test(val)) {
      return decodeURIComponent(val);
    }
    // Otherwise, convert ISO-8859-1 (Latin1) Mojibake back to UTF-8
    return Buffer.from(val, 'latin1').toString('utf8');
  } catch {
    return val;
  }
}

export async function createAuditLog(options: AuditLogOptions) {
  // Execute asynchronously in try-catch so it never blocks the main transaction
  try {
    const {
      actor,
      action,
      actionLabel,
      module,
      entityType,
      entityId,
      entityName,
      description,
      oldValues,
      newValues,
      request,
      status = 'success',
      errorMessage
    } = options;

    let currentActor = actor ? { ...actor } : null;
    
    if (currentActor && currentActor.name) {
      currentActor.name = decodeHeaderValue(currentActor.name);
    }
    
    // If actor is not passed, try to extract from request headers or cookies
    if (!currentActor) {
      if (request) {
        const headerId = request.headers.get('x-user-id');
        const headerName = request.headers.get('x-user-name');
        const headerEmail = request.headers.get('x-user-email');
        const headerRole = request.headers.get('x-user-role');
        if (headerId && headerName) {
          currentActor = {
            id: headerId,
            name: decodeHeaderValue(headerName),
            email: headerEmail || '',
            role: headerRole || 'member'
          };
        }
      }

      if (!currentActor) {
        try {
          const cookieStore = await cookies();
          const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
          if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
              currentActor = decoded;
            }
          }
        } catch (e) {
          // cookies() might fail if not in a request context
        }
      }
    }

    // Extract request info
    let ipAddress = null;
    let userAgent = null;
    let requestMethod = null;
    let requestPath = null;

    if (request) {
      requestMethod = request.method;
      try {
        if ('nextUrl' in request) {
          requestPath = (request as any).nextUrl.pathname;
        } else {
          requestPath = new URL(request.url).pathname;
        }
      } catch (e) {
        requestPath = request.url;
      }
      
      userAgent = request.headers.get('user-agent');
      ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      if (ipAddress && ipAddress.includes(',')) {
        ipAddress = ipAddress.split(',')[0].trim();
      }
    }

    // Compute changes
    const maskedOld = oldValues ? maskSensitiveData(oldValues) : null;
    const maskedNew = newValues ? maskSensitiveData(newValues) : null;
    const changedFields = (maskedOld && maskedNew) ? getChangedFields(maskedOld, maskedNew) : [];

    // Create DB entry
    await prisma.auditLog.create({
      data: {
        actorUserId: currentActor?.id || null,
        actorName: currentActor?.name || 'Guest',
        actorEmail: currentActor?.email || null,
        actorRole: currentActor?.role || 'guest',
        action,
        actionLabel,
        module,
        entityType: entityType || null,
        entityId: entityId || null,
        entityName: entityName || null,
        description,
        oldValues: maskedOld ? JSON.stringify(maskedOld) : null,
        newValues: maskedNew ? JSON.stringify(maskedNew) : null,
        changedFields: changedFields.length > 0 ? JSON.stringify(changedFields) : null,
        ipAddress,
        userAgent,
        requestMethod,
        requestPath,
        status,
        errorMessage: errorMessage || null
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
