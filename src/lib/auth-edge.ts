const TOKEN_COOKIE_NAME = 'nhanh_media_auth_token';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('Crucial security configuration missing: JWT_SECRET must be defined in the environment variables.');
}

export interface UserSessionPayload {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function verifyTokenEdge(token: string): Promise<UserSessionPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature using Web Crypto API (Edge runtime compatible)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(JWT_SECRET);
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode base64url signature to binary array
    let base64Sig = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Sig.length % 4) {
      base64Sig += '=';
    }
    const sigStr = atob(base64Sig);
    const sigBuf = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigBuf[i] = sigStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify('HMAC', key, sigBuf, data);
    if (!isValid) return null;

    // Decode payload JSON
    let base64Payload = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Payload.length % 4) {
      base64Payload += '=';
    }
    const payloadJson = atob(base64Payload);
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    console.error('verifyTokenEdge error:', error);
    return null;
  }
}

import { NextRequest } from 'next/server';

export function getAuthToken(req: NextRequest): string | null {
  // Try cookie first
  const cookieToken = req.cookies.get(TOKEN_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // Fallback to Authorization Header (e.g. Bearer token)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}
