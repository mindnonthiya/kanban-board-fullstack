import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

//ต้องตรงกับใน auth.ts
const SECRET_KEY = process.env.JWT_SECRET || 'fallback_secret_key_change_in_prod';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access denied (No token)' });
        return;
    }

    jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
        if (err) {
            console.error("Token verification failed:", err.message);
            res.status(403).json({ error: 'Invalid token' });
            return;
        }
        req.user = user;
        next();
    });
};