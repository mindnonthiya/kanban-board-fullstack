import { Router, Response } from 'express';
import { pool } from './db';
import { authenticateToken, AuthRequest } from './authMiddleware'; // ใช้ authMiddleware ตามไฟล์ของคุณ

const router = Router();

//ดึงบอร์ดทั้งหมด
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        const result = await pool.query(`
            SELECT DISTINCT b.* FROM boards b
            LEFT JOIN board_members bm ON b.id = bm.board_id
            WHERE b.user_id = $1 OR bm.user_id = $1
            ORDER BY b.created_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//สร้างบอร์ดใหม่
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const result = await pool.query(
            'INSERT INTO boards (name, user_id) VALUES ($1, $2) RETURNING *',
            [name, userId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//Invite สมาชิกเข้าบอร์ด
router.post('/:id/invite', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // board_id
        const { email } = req.body; // email เพื่อนที่จะเชิญ
        const userId = req.user?.id;

        //เช็คว่าเป็นเจ้าของบอร์ด
        const boardCheck = await pool.query('SELECT * FROM boards WHERE id = $1 AND user_id = $2', [id, userId]);
        if (boardCheck.rows.length === 0) {
            res.status(403).json({ error: 'Only owner can invite' });
            return;
        }
        const boardName = boardCheck.rows[0].name; // เก็บชื่อบอร์ดไว้แจ้งเตือน

        //หา User ID ของเพื่อนจาก Email
        const friendCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (friendCheck.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const friendId = friendCheck.rows[0].id;

        //ห้ามเชิญตัวเอง
        if (friendId === userId) {
            res.status(400).json({ error: 'Cannot invite yourself' });
            return;
        }

        //เพิ่มลงตาราง board_members
        await pool.query(`
            INSERT INTO board_members (board_id, user_id) 
            VALUES ($1, $2) 
            ON CONFLICT (board_id, user_id) DO NOTHING
        `, [id, friendId]);

        await pool.query(`
    INSERT INTO notifications (user_id, board_id, message) 
    VALUES ($1, $2, $3)
`, [friendId, id, `คุณถูกเชิญเข้าสู่บอร์ด: "${boardName}"`]);

        res.json({ message: `Invited ${email} successfully!` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//แก้ไขชื่อบอร์ด
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const userId = req.user?.id;

        const result = await pool.query(
            'UPDATE boards SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [name, id, userId]
        );

        if (result.rows.length === 0) {
            res.status(403).json({ error: 'Cannot update board' });
            return;
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//ลบบอร์ด
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const check = await pool.query('SELECT * FROM boards WHERE id = $1 AND user_id = $2', [id, userId]);
        if (check.rows.length === 0) {
            res.status(403).json({ error: 'Not your board' });
            return;
        }

        await pool.query('DELETE FROM boards WHERE id = $1', [id]);
        res.json({ message: 'Board deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//ดึงรายชื่อสมาชิกในบอร์ด
router.get('/:id/members', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT u.id, u.username, u.email 
            FROM users u
            JOIN board_members bm ON u.id = bm.user_id
            WHERE bm.board_id = $1
            UNION
            SELECT u.id, u.username, u.email
            FROM users u
            JOIN boards b ON u.id = b.user_id
            WHERE b.id = $1
        `, [id]);

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//ดึงข้อมูลบอร์ดเพื่อเอาชื่อบอร์ดไปแสดง
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        //หาบอร์ดนี้ โดยต้องเป็น Owner หรือ Member เท่านั้น ถึงจะมีสิทธิ์เห็น
        const result = await pool.query(`
        SELECT b.* FROM boards b
        LEFT JOIN board_members bm ON b.id = bm.board_id
        WHERE b.id = $1 AND (b.user_id = $2 OR bm.user_id = $2)
      `, [id, userId]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Board not found' });
            return;
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;