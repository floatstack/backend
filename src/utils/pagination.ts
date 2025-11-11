import { Request } from 'express';
import { logger } from './logger.js';
import { successResponse } from './response.js';
import { validateModules } from './helper.js';

interface PaginationMeta {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    last_page: number;
}

interface PaginatedResult<T> {
    [key: string]: any;
    pagination: PaginationMeta;
}

export interface PaginationParams {
    page: number;
    limit: number;
    sort?: { field: string; direction: 'asc' | 'desc' } | undefined;
    filters?: Record<string, string> | undefined; 
    search?: string | undefined;
    include_inactive?: boolean | undefined;
}

export class Pagination {
    static getPaginationParams(
        req: Request,
        options: {
            allowedSortFields: string[];
            allowedFilters?: string[];
        }
    ): PaginationParams {
        const { allowedSortFields, allowedFilters } = options;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sort = req.query.sort as string;
        const search = req.query.search as string;
        const include_inactive = req.query.include_inactive === 'true';
      
        // Validate page and limit
        if (page < 1 || limit < 1) {
            throw { statusCode: 400, message: 'Page and limit must be positive integers', errors: [] };
        }

        if (limit > 100) {
            throw { statusCode: 400, message: 'Limit cannot exceed 100', errors: [] };
        }

        // Validate sort
        let sortField: { field: string; direction: 'asc' | 'desc' } | undefined;
        if (sort) {
            const [field, direction] = sort.split(':');
            if (!field || !direction) {
                throw { statusCode: 400, message: 'Invalid sort parameter format', errors: [] };
            }

            if (!allowedSortFields.includes(field) || !['asc', 'desc'].includes(direction)) {
                throw {
                    statusCode: 400,
                    message: `Invalid sort parameter. Use one of ${allowedSortFields
                        .map((f) => `${f}:asc, ${f}:desc`)
                        .join(', ')}`,
                    errors: [],
                };
            }
            sortField = { field, direction: direction as 'asc' | 'desc' };
        }

        // Parse filters from query parameters (exclude reserved params)
        const reservedParams = ['page', 'limit', 'sort', 'search', 'include_inactive'];
        const filters: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.query)) {
            if (!reservedParams.includes(key) && typeof value === 'string') {
                if (allowedFilters && !allowedFilters.includes(key)) {
                    throw { statusCode: 400, message: `Invalid filter key: ${key}`, errors: [] };
                }
                if (key === 'module_id') {
                    validateModules([value]);
                }
                if (value.length > 50) {
                    throw { statusCode: 400, message: `Filter value for ${key} cannot exceed 50 characters`, errors: [] };
                }
                filters[key] = value;
            }
        }

        // Validate search
        if (search && search.length > 100) {
            throw { statusCode: 400, message: 'Search term cannot exceed 100 characters', errors: [] };
        }
     
        return { page, limit, sort: sortField, filters: Object.keys(filters).length > 0 ? filters : undefined, search, include_inactive };
    }

    static async paginate<T>(
        req: Request,
        resourceName: string,
        findManyFn: (params: PaginationParams) => Promise<T[]>,
        countFn: (params: PaginationParams) => Promise<number>,
        options?: { allowedSortFields: string[]; allowedFilters?: string[] }
    ): Promise<{ status: boolean; statusCode: number; message: string; data: PaginatedResult<T> }> {
        try {
            const params = this.getPaginationParams(req, {
                allowedSortFields: options?.allowedSortFields ?? [],
                allowedFilters: options?.allowedFilters ?? [],
            });
            const { page, limit } = params;
            const [data, total] = await Promise.all([findManyFn(params), countFn(params)]);

            const pagination: PaginationMeta = {
                current_page: page,
                per_page: limit,
                total,
                total_pages: Math.ceil(total / limit),
                has_next: page * limit < total,
                has_prev: page > 1,
                last_page: Math.ceil(total / limit),
            };

            return successResponse(200, `${resourceName.toLowerCase()} retrieved`, {
                [resourceName]: data,
                pagination,
            });
        } catch (error: any) {
            logger.error('Pagination error', { error: error.message, path: req.path });
            throw {
                statusCode: error.statusCode || 500,
                message: error.message || `Failed to retrieve ${resourceName}`,
                errors: error.errors || [error.message],
            };
        }
    }

    static getPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
        return {
            current_page: page,
            per_page: limit,
            total,
            total_pages: Math.ceil(total / limit),
            has_next: page * limit < total,
            has_prev: page > 1,
            last_page: Math.ceil(total / limit),
        };
    }
}