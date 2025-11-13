import { Request, Response, NextFunction } from 'express';
import { ObjectSchema, ArraySchema, Schema, StringSchema } from 'joi';
import Joi from 'joi';
import sanitizeHtml from 'sanitize-html';
import { errorResponse } from '../utils/response.js';
import { AuthRequest } from './authMiddleware.js';

export interface UserRequest extends AuthRequest {
    payload?: any;
}

export const validateRequestBody =
    (
        schema: ObjectSchema | ArraySchema,
        target: 'body' | 'query' = 'body',
        skipSanitization: string[] = ['password', 'token', 'otp'],
    ) =>
        async (req: UserRequest, res: Response, next: NextFunction) => {
            try {
                // Ensure schema.describe().keys exists (only for object schemas)
                const schemaDesc = schema.describe();
                const keys = (schemaDesc as any).keys;

                // Start with the original schema
                let trimmedSchema: ObjectSchema | ArraySchema = schema;

                // Only modify if there are keys (object schema)
                if (keys && typeof keys === 'object') {
                    const newSchema: Record<string, Schema> = {};

                    for (const key in keys) {
                        const fieldSchema = (schema as ObjectSchema).extract(key);

                        if ((fieldSchema as StringSchema)?.trim) {
                            newSchema[key] = (fieldSchema as StringSchema).trim();
                        } else {
                            newSchema[key] = fieldSchema;
                        }
                    }

                    trimmedSchema = Joi.object(newSchema);
                }

                // Pick the correct request target
                const data = target === 'body' ? req.body : req.query;

                const { error, value } = trimmedSchema.validate(data || {}, { stripUnknown: true });

                if (error) {
                    return res
                        .status(400)
                        .json(
                            errorResponse(
                                400,
                                `Invalid ${target} parameters`,
                                error.details.map((d) => d.message),
                            )
                        );
                }

                // Sanitize validated data
                const sanitizedValue = Object.keys(value || {}).reduce((acc, key) => {
                    if (typeof value[key] === 'string' && !skipSanitization.includes(key)) {
                        acc[key] = sanitizeHtml(value[key], {
                            allowedTags: [],
                            allowedAttributes: {},
                        });
                    } else {
                        acc[key] = value[key];
                    }
                    return acc;
                }, {} as Record<string, any>);

                req.payload = sanitizedValue;
                return next();
            } catch (err) {
                console.error('Validation middleware error:', err);
                return res.status(500).json(
                    errorResponse(500, 'Validation middleware failed', [String(err)])
                );
            }
        };
