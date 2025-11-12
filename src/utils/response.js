"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
function successResponse(statusCode, message, data) {
    if (statusCode === void 0) { statusCode = 200; }
    if (message === void 0) { message = 'Success'; }
    return { status: true, statusCode: statusCode, message: message, data: data };
}
function errorResponse(statusCode, message, errors) {
    if (statusCode === void 0) { statusCode = 500; }
    return { status: false, statusCode: statusCode, message: message, errors: errors };
}
