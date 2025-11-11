import { Request, Response, NextFunction } from 'express';
import { ObjectSchema, ArraySchema, Schema, StringSchema } from 'joi';
import Joi from 'joi';
import sanitizeHtml from 'sanitize-html';
import { errorResponse } from '../utils/response.js';

export interface UserRequest extends Request {
    payload?: any;
    user?: { user_id: string; permissions: string[] };
}

export const validateRequestBody =
    (
        schema: ObjectSchema | ArraySchema,
        target: 'body' | 'query' = 'body',
        skipSanitization: string[] = ['password', 'token', 'otp'],
    ) =>
        async (req: Request<unknown>, res: Response, next: NextFunction) => {
            const keys = schema.describe().keys;
            const newSchema: Record<string, Schema> = {};

            for (const key in keys) {
                const fieldSchema = schema.extract(key);

                // Check if the schema is a string schema before calling trim()
                if ((fieldSchema as StringSchema).trim) {
                    newSchema[key] = (fieldSchema as StringSchema).trim();
                } else {
                    newSchema[key] = fieldSchema;
                }
            }

            const trimmedSchema = Joi.object(newSchema);

            const data = target === 'body' ? req.body : req.query;
            const { error, value } = trimmedSchema.validate(data, { stripUnknown: true });
           
            if (error) {
                return res
                    .status(400)
                    .json(errorResponse(400, `Invalid ${target} parameters`, error.details.map((d) => d.message)));
            }

            // Sanitize string fields with sanitize-html, except skipped fields
            const sanitizedValue = Object.keys(value).reduce((acc, key) => {
                if (typeof value[key] === 'string' && !skipSanitization.includes(key)) {
                    acc[key] = sanitizeHtml(value[key], {
                        allowedTags: [], // Strip all HTML tags
                        allowedAttributes: {}, // No attributes allowed
                    });
                } else {
                    acc[key] = value[key];
                }
                return acc;
            }, {} as { [key: string]: any });

            (req as UserRequest).payload = sanitizedValue;
            return next();
        };
