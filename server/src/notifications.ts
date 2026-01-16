import { Router, Response } from 'express';
import { pool } from './db';
import { authenticateToken, AuthRequest } from './authMiddleware';

const router = Router();

//ดึงการแจ้งเตือน(เฉพาะที่ยังไม่อ่าน หรือ อ่านแล้วไม่เกิน 10 อันล่าสุด)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const result = await pool.query(`
            SELECT * FROM notifications 
            WHERE user_id = $1 
            ORDER BY is_read ASC, created_at DESC 
            LIMIT 20
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//อ่านแล้ว
router.put('/:id/read', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
        res.json({ message: 'Read' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;