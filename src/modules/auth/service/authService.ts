import { prisma, Prisma } from '../../../config/database.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


interface LoginResponse {
    authorization: {
        access_token: string;
        refresh_token: string;
    };

}

export class AuthService {
    static async login(email: string, password: string): Promise<LoginResponse> {
        const user = await prisma.users.findUnique({
            where: { email, deleted_at: null },
            include: {
                user_roles: {
                    include: {
                        role: {
                           
                        },
                    },
                }
            },
        });

        if (!user || user.status !== 'active') {
            throw { statusCode: 401, message: 'Invalid credentials or user has been suspended', errors: [] };
        }

        if (!user.password_hash || !await bcrypt.compare(password, user.password_hash)) {
            throw { statusCode: 401, message: 'Invalid credentials', errors: [] };
        }

        const roles = user.user_roles.map((ur:any) => ur.role.name);
    
        const payload = { user_id: user.id.toString(), roles };
        const access_token = jwt.sign(payload, process.env.JWT_SECRET || 'access-secret', {
            expiresIn: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES || '90000', 10),
        });
        const refresh_token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh-secret', {
            expiresIn: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES || '604800', 10),
        });


        await prisma.users.update({
            where: { id: user.id },
            data: { last_login_at: new Date() },
        });

        return { authorization: { access_token, refresh_token } };
    }

}