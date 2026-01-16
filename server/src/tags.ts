import { Router, Response } from 'express';
import { pool } from './db';
import { authenticateToken, AuthRequest } from './authMiddleware';

const router = Router();

//ดึง Tag ทั้งหมดของบอร์ด
router.get('/:boardId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { boardId } = req.params;
        const result = await pool.query('SELECT * FROM tags WHERE board_id = $1 ORDER BY id', [boardId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//สร้าง Tag ใหม่
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, color, boardId } = req.body;
        const result = await pool.query(
            'INSERT INTO tags (name, color, board_id) VALUES ($1, $2, $3) RETURNING *',
            [name, color, boardId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//แปะ Tag เข้าไปใน Task
router.post('/task', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { taskId, tagId } = req.body;
        await pool.query(
            'INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [taskId, tagId]
        );
        res.json({ message: 'Tag added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//เอา Tag ออกจาก Task
router.delete('/task/:taskId/:tagId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { taskId, tagId } = req.params;
        await pool.query('DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2', [taskId, tagId]);
        res.json({ message: 'Tag removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;