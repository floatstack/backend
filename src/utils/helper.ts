import { prisma } from '../config/database.js';
import { randomBytes } from 'crypto';
import JoiBase from "joi";
import type { ExtensionFactory } from "joi";
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import pLimit from 'p-limit';
import crypto from 'crypto';
import { log } from 'console';

const IV_LENGTH = process.env.IV_LENGTH ? parseInt(process.env.IV_LENGTH) : 16;
const TAG_LENGTH = process.env.TAG_LENGTH ? parseInt(process.env.TAG_LENGTH) : 16;






// Helper function to remove undefined values from an object
export const removeUndefined = (obj: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  );
};

// Simple phone verifier for E.164 format
export function verifyPhone(phone: string | null | undefined): boolean {
  if (!phone) return true;
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}



export function serializeData(value: any): any {
  if (typeof value === 'bigint') return value.toString();

  if (value && typeof value === 'object' && typeof (value as any).toNumber === 'function') {
    try {
      return (value as any).toNumber();
    } catch {
      return (value as any).toString();
    }
  }

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map(serializeData);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeData(v)])
    );
  }

  return value;
}







export function generateRandomString(length: number, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
  if (!Number.isInteger(length) || length <= 0) {
    throw new TypeError('length must be a positive integer');
  }

  const chars = charset;
  const charLen = chars.length;

  const bytes: Uint8Array = randomBytes(length);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i]! % charLen];
  }
  return result;
}

export function handlePrismaError(error: any) {
  // Log the actual Prisma error internally for debugging
  logger.error('Prisma error occurred', {
    name: error.name,
    code: error.code,
    message: error.message,
    meta: error.meta || null,
    stack: error.stack || null,
  });

  // Always return a generic error response to the client
  return errorResponse(
    500,
    'Internal server error',
    ['An unexpected error occurred while processing your request.']
  );
}



export function encrypt(text: string): string {
  const encryption_key = process.env.ENCRYPTION_KEY;
  if (!encryption_key) {
    logger.error('ENCRYPTION_KEY is not set in environment variables.');
    throw new Error('Internal server error.');
  }

  const ENCRYPTION_KEY = crypto.createHash('sha256').update(encryption_key).digest();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(encryptedText: string): string {
  const data = Buffer.from(encryptedText, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const text = data.subarray(IV_LENGTH + TAG_LENGTH);

  const encryption_key = process.env.ENCRYPTION_KEY;
  if (!encryption_key) {
    logger.error('ENCRYPTION_KEY is not set in environment variables.');
    throw new Error('Internal server error.');
  }

  const ENCRYPTION_KEY = crypto.createHash('sha256').update(encryption_key).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    logger.error('Failed to decrypt data. It may have been tampered with.');
    throw new Error('Internal server error.');
  }
}

export function generateLookupKey(value: string): string {
  const secret = process.env.LOOKUP_KEY;
  if (!secret) {
    logger.error('LOOKUP_KEY is not set in environment variables.');
    throw new Error('Internal server error.');
  }


  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}