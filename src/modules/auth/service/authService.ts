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
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                role: { select: { name: true } },
            },
        });

        if (!user || user.status !== 'active') {
            throw { statusCode: 401, message: 'Invalid credentials or user has been suspended', errors: [] };
        }

        if (!user.password_hash || !await bcrypt.compare(password, Buffer.from(user.password_hash).toString())) {
            throw { statusCode: 401, message: 'Invalid credentials', errors: [] };
        }

        let bankDomain=null;
        // Get Route
        if (user.bank_id) {
            // bankDomain = await prisma.bankDomain.findFirst({
            //     where: { bank_id: user.bank_id },
            // });

        }


        const payload = {
            user_id: user.id.toString(),
            bank_id: user.bank_id ? user.bank_id.toString() : null,
            agent_id: user.agent_id ? user.agent_id.toString() : null,
            role: {
                role_id: user.role_id.toString(),
                role: user.role.name
            },
            // route: bankDomain ? bankDomain.url : null
            route: ""
        };
        const access_token = jwt.sign(payload, process.env.JWT_SECRET || 'access-secret', {
            expiresIn: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES || '90000', 10),
        });
        const refresh_token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh-secret', {
            expiresIn: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES || '604800', 10),
        });


        await prisma.user.update({
            where: { id: user.id },
            data: { last_login_at: new Date() },
        });

        return { authorization: { access_token, refresh_token } };

    }

}