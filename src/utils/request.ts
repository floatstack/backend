import type { Request } from "express";

export type AuthUser = {
    id: string;
    [k: string]: any;
};

export interface UserRequest extends Request {
    user: AuthUser;
    payload: any;
}