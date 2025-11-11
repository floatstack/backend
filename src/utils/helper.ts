import { prisma } from '../config/database.js';
import { randomBytes } from 'crypto';
import JoiBase from "joi";
import type { ExtensionFactory } from "joi";
import { errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { sendEmail } from './sendEmail.js';
import pLimit from 'p-limit';






// Helper function to remove undefined values from an object
export const removeUndefined = (obj: Record<string, any>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  );
};

// Simple phone verifier for E.164 format (since frontend sends with country code)
export function verifyPhone(phone: string | null | undefined): boolean {
  if (!phone) return true;
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

export function omit<Data extends object, Keys extends keyof Data>(
  data: Data | undefined | null,
  keys: Keys[],
): Omit<Data, Keys> | undefined {
  if (!data) {
    return;
  }
  const result = { ...data };

  for (const key of keys) {
    delete result[key];
  }

  return result as Omit<Data, Keys>;
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







export function generateRandomString(length: number,charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
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


const csvStringArray: ExtensionFactory = (joi) => ({
  type: "csvStringArray",
  base: joi.array().items(joi.string().pattern(/^\d+$/)),
  coerce: {
    from: "string",
    method(value: string) {
      if (!value.trim()) return { value: [] };
      return { value: value.split(",").map((s: string) => s.trim()) };
    },
  },
});

const csvNumberArray: ExtensionFactory = (joi) => ({
  type: "csvNumberArray",
  base: joi.array().items(joi.number().integer().positive()),
  coerce: {
    from: "string",
    method(value: string, helpers) {
      if (!value.trim()) return { value: [] };
      const parts = value.split(",").map((s: string) => Number(s.trim()));
      const invalid = parts.find((n) => !Number.isInteger(n) || n <= 0);
      if (invalid !== undefined) {
        return {
          errors: [helpers.error("any.invalid", { message: "All IDs must be positive integers" })],
        };
      }
      return { value: parts };
    },
  },
});

export const JoiCsv = JoiBase.extend(csvStringArray, csvNumberArray);


