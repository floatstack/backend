// import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// // import { PrismaClient } from "../generated/prisma/client.js";
// import { errorResponse } from "../utils/response.js";
// import { logger } from "../utils/logger.js";
// import { handlePrismaError } from "../utils/helper.js";

// const prisma = new PrismaClient();

// interface JwtPayload {
//     user_id: string;
//     roles: string[];
//     permissions: string[];
// }

// interface AuthRequest extends Request {
//     user?: JwtPayload;
// }

// export const authMiddleware = (
//     requiredPermissions: string | string[],
//     requiredRoles: string | string[] = []
// ) => {
//     return async (req: AuthRequest, res: Response, next: NextFunction) => {
//         try {
//             const authHeader = req.headers.authorization;
//             if (!authHeader || !authHeader.startsWith("Bearer ")) {
//                 return res
//                     .status(401)
//                     .json(
//                         errorResponse(
//                             401,
//                             "Unauthorized: Authentication required. Please sign in to continue.",
//                             ["Missing or invalid token"]
//                         )
//                     );
//             }

//             const token = authHeader.split(" ")[1];

//             if (!token) {
//                 return res
//                     .status(401)
//                     .json(
//                         errorResponse(
//                             401,
//                             "Unauthorized: Authentication required. Please sign in to continue.",
//                             ["Missing token"]
//                         )
//                     );
//             }

//             const payload = jwt.verify(
//                 token,
//                 process.env.JWT_SECRET || "access-secret"
//             ) as unknown as JwtPayload;
//             if (!payload.user_id || !payload.permissions) {
//                 return res
//                     .status(401)
//                     .json(
//                         errorResponse(
//                             401,
//                             "Unauthorized: Your session is invalid or has expired. Please sign in again.",
//                             ["Invalid token"]
//                         )
//                     );
//             }

//             // Validate user exists and is active
//             const user = await prisma.users.findUnique({
//                 where: { id: BigInt(payload.user_id) },
//                 select: { id: true, status: true },
//             });

//             if (!user || user.status !== "active") {
//                 return res
//                     .status(401)
//                     .json(
//                         errorResponse(
//                             401,
//                             "Unauthorized: Your account is inactive. Please contact support if you think this is a mistake.",
//                             ["User not found or inactive"]
//                         )
//                     );
//             }

//             // Normalize requiredPermissions and requiredRoles to array
//             const permissionsToCheck = Array.isArray(requiredPermissions)
//                 ? requiredPermissions
//                 : [requiredPermissions];
//             const rolesToCheck = Array.isArray(requiredRoles)
//                 ? requiredRoles
//                 : [requiredRoles];

//             // Check if user has at least one required role
//             if (rolesToCheck.length > 0) {
//                 const hasRequiredRole = rolesToCheck.some((role) =>
//                     payload.roles.includes(role)
//                 );
//                 if (!hasRequiredRole) {
//                     return res
//                         .status(403)
//                         .json(
//                             errorResponse(403, "Forbidden", [
//                                 `Forbidden: You do not have the required permissions to access this resource`,
//                             ])
//                         );
//                 }
//             }
//             // Check if user has at least one required permission
//             if (
//                 permissionsToCheck.length > 0 &&
//                 !permissionsToCheck.some((perm) => payload.permissions.includes(perm))
//             ) {
//                 logger.warn("Insufficient permissions", {
//                     user_id: payload.user_id,
//                     requiredPermissions: permissionsToCheck,
//                     userPermissions: payload.permissions,
//                     path: req.path,
//                 });
//                 return res
//                     .status(403)
//                     .json(
//                         errorResponse(
//                             403,
//                             "Forbidden: You do not have the required permissions to access this resource.",
//                             [`Missing required permissions: ${permissionsToCheck.join(", ")}`]
//                         )
//                     );
//             }

//             req.user = payload;
//             next();
//         } catch (error: any) {
//             logger.error("Authentication error", {
//                 error: error.message,
//                 path: req.path,
//             });
//             if (error.name?.startsWith("Prisma")) {
//                 const prismaError = handlePrismaError(error);
//                 return res.status(prismaError.statusCode).json(prismaError);
//             }
//             if (error.name === "TokenExpiredError") {
//                 return res
//                     .status(401)
//                     .json(
//                         errorResponse(
//                             401,
//                             "Unauthorized: Your session is invalid or has expired. Please sign in again.",
//                             [error.message || "Token expired"]
//                         )
//                     );
//             }

//             return res
//                 .status(401)
//                 .json(
//                     errorResponse(
//                         401,
//                         "Unauthorized: Your session is invalid or has expired. Please sign in again.",
//                         [error.message || "Authentication failed"]
//                     )
//                 );
//         }
//     };
// };
