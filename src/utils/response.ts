export interface SuccessResponse<T> {
    status: true;
    statusCode: number;
    message: string;
    data: T;
}

export interface ErrorResponse {
    status: false;
    statusCode: number;
    message: string;
    errors: any[];
}

export function successResponse<T>(
    statusCode: number = 200,
    message: string = 'Success',
    data: T,
): SuccessResponse<T> {
    return { status: true, statusCode: statusCode,  message, data };
}

export function errorResponse(
    statusCode: number = 500,
    message: string,
    errors: any[],
): ErrorResponse {
    return { status: false, statusCode: statusCode, message, errors };
}