"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeUndefined = void 0;
exports.verifyPhone = verifyPhone;
exports.serializeData = serializeData;
exports.generateRandomString = generateRandomString;
exports.handlePrismaError = handlePrismaError;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.generateLookupKey = generateLookupKey;
var crypto_1 = require("crypto");
var response_js_1 = require("../utils/response.js");
var logger_js_1 = require("../utils/logger.js");
var crypto_2 = require("crypto");
var IV_LENGTH = process.env.IV_LENGTH ? parseInt(process.env.IV_LENGTH) : 16;
var TAG_LENGTH = process.env.TAG_LENGTH ? parseInt(process.env.TAG_LENGTH) : 16;
// Helper function to remove undefined values from an object
var removeUndefined = function (obj) {
    return Object.fromEntries(Object.entries(obj).filter(function (_a) {
        var _ = _a[0], value = _a[1];
        return value !== undefined;
    }));
};
exports.removeUndefined = removeUndefined;
// Simple phone verifier for E.164 format
function verifyPhone(phone) {
    if (!phone)
        return true;
    var e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
}
function serializeData(value) {
    if (typeof value === 'bigint')
        return value.toString();
    if (value && typeof value === 'object' && typeof value.toNumber === 'function') {
        try {
            return value.toNumber();
        }
        catch (_a) {
            return value.toString();
        }
    }
    if (value instanceof Date)
        return value.toISOString();
    if (Array.isArray(value)) {
        return value.map(serializeData);
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(function (_a) {
            var k = _a[0], v = _a[1];
            return [k, serializeData(v)];
        }));
    }
    return value;
}
function generateRandomString(length, charset) {
    if (charset === void 0) { charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; }
    if (!Number.isInteger(length) || length <= 0) {
        throw new TypeError('length must be a positive integer');
    }
    var chars = charset;
    var charLen = chars.length;
    var bytes = (0, crypto_1.randomBytes)(length);
    var result = '';
    for (var i = 0; i < length; i++) {
        result += chars[bytes[i] % charLen];
    }
    return result;
}
function handlePrismaError(error) {
    // Log the actual Prisma error internally for debugging
    logger_js_1.logger.error('Prisma error occurred', {
        name: error.name,
        code: error.code,
        message: error.message,
        meta: error.meta || null,
        stack: error.stack || null,
    });
    // Always return a generic error response to the client
    return (0, response_js_1.errorResponse)(500, 'Internal server error', ['An unexpected error occurred while processing your request.']);
}
function encrypt(text) {
    var encryption_key = process.env.ENCRYPTION_KEY;
    if (!encryption_key) {
        logger_js_1.logger.error('ENCRYPTION_KEY is not set in environment variables.');
        throw new Error('Internal server error.');
    }
    var ENCRYPTION_KEY = crypto_2.default.createHash('sha256').update(encryption_key).digest();
    var iv = crypto_2.default.randomBytes(IV_LENGTH);
    var cipher = crypto_2.default.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    var encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    var tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}
function decrypt(encryptedText) {
    var data = Buffer.from(encryptedText, 'base64');
    var iv = data.subarray(0, IV_LENGTH);
    var tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    var text = data.subarray(IV_LENGTH + TAG_LENGTH);
    var encryption_key = process.env.ENCRYPTION_KEY;
    if (!encryption_key) {
        logger_js_1.logger.error('ENCRYPTION_KEY is not set in environment variables.');
        throw new Error('Internal server error.');
    }
    var ENCRYPTION_KEY = crypto_2.default.createHash('sha256').update(encryption_key).digest();
    var decipher = crypto_2.default.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    try {
        var decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch (_a) {
        logger_js_1.logger.error('Failed to decrypt data. It may have been tampered with.');
        throw new Error('Internal server error.');
    }
}
function generateLookupKey(value) {
    var secret = process.env.LOOKUP_KEY;
    if (!secret) {
        logger_js_1.logger.error('LOOKUP_KEY is not set in environment variables.');
        throw new Error('Internal server error.');
    }
    return crypto_2.default.createHmac('sha256', secret).update(value).digest('hex');
}
