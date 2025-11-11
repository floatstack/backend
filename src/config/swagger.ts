import swaggerJSDoc from 'swagger-jsdoc';
import dotenv from "dotenv";

dotenv.config();

// This is the OPTIONS object that swagger-jsdoc needs
const v1SwaggerOptions: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Floatstack System API',
            version: '1.0.0',
            description: 'API for ',
            contact: {
                name: process.env.CONTACT_NAME || 'Floatstack Support',
                email: process.env.CONTACT_EMAIL || 'support@floatstack.com',
            },
        },
        tags: [
            { name: "Authentication", description: "Authentication & Authorization endpoints" },
            { name: "Api", description: "Generic endpoints" }
        ],
        servers: [
            { url: process.env.V1_DEVELOPMENT_URL || 'http://localhost:3000/api/v1', description: 'Development (v1)' },
            { url: process.env.V1_STAGING_URL || 'https://jewel360.digitaljewels.net/api/v1', description: 'Staging (v1)' },
        ],
        components: {
            schemas: {
                SuccessResponse: {
                    type: "object",
                    properties: {
                        status: { type: "boolean", example: true },
                        statusCode: { type: "integer", example: 200 },
                        message: { type: "string", example: "Success" },
                        data: { type: "object" }
                    }
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        status: { type: "boolean", example: false },
                        statusCode: { type: "integer", example: 400 },
                        message: { type: "string", example: "Bad request" },
                        errors: { type: "array", items: { type: "string" } }
                    }
                }
            },
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: [
        './src/modules/v1/**/*.{ts,js}',
        './dist/modules/v1/**/*.js'      // For Docker container
    ],
};


const v1SwaggerSpec = swaggerJSDoc(v1SwaggerOptions);



export default {
    v1: v1SwaggerSpec,
    options: v1SwaggerOptions
};
