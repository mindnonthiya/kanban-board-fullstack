import { Router, Response } from 'express';
import { pool } from './db';
import { authenticateToken, AuthRequest } from './authMiddleware';

const router = Router();

//ดึง Columns
router.get('/:boardId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { boardId } = req.params;
        const result = await pool.query('SELECT * FROM columns WHERE board_id = $1 ORDER BY id', [boardId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//สร้าง Column ใหม่
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, boardId } = req.body; // รับค่า name และ boardId

        if (!name || !boardId) {
            res.status(400).json({ error: 'Missing name or boardId' });
            return;
        }

        const result = await pool.query(
            'INSERT INTO columns (name, board_id) VALUES ($1, $2) RETURNING *',
            [name, boardId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//แก้ไขชื่อ Column
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const result = await pool.query(
            'UPDATE columns SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//ลบ Column
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM columns WHERE id = $1', [id]);
        res.json({ message: 'Column deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;