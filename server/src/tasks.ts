import { Router, Response } from 'express';
import { pool } from './db';
import { authenticateToken, AuthRequest } from './authMiddleware';

const router = Router();

//ดึง Task ทั้งหมด
router.get('/:boardId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { boardId } = req.params;
        const result = await pool.query(`
      SELECT t.*, u.username as assignee_name,
             COALESCE(
                 json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color', tg.color)) 
                 FILTER (WHERE tg.id IS NOT NULL), 
                 '[]'
             ) as tags
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN tags tg ON tt.tag_id = tg.id
      WHERE c.board_id = $1
      GROUP BY t.id, u.username
      ORDER BY t.position ASC
    `, [boardId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//สร้าง Task ใหม่
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, columnId, assigneeId } = req.body;
        const currentUserId = req.user?.id;

        //บันทึก Task
        const result = await pool.query(
            'INSERT INTO tasks (title, column_id, assignee_id) VALUES ($1, $2, $3) RETURNING *',
            [title, columnId, assigneeId || currentUserId]
        );
        const newTask = result.rows[0];

        //หา board_id จาก columnId เพื่อเอาไปใส่ใน notification
        const colRes = await pool.query('SELECT board_id FROM columns WHERE id = $1', [columnId]);
        const boardId = colRes.rows[0]?.board_id;

        //ส่งแจ้งเตือน
        if (assigneeId && assigneeId !== currentUserId && boardId) {
            await pool.query(`
                INSERT INTO notifications (user_id, board_id, message) 
                VALUES ($1, $2, $3)
            `, [assigneeId, boardId, `คุณได้รับมอบหมายงานใหม่: "${title}"`]);
        }

        res.json(newTask);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//ย้ายตำแหน่ง Task
router.put('/:id/move', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { columnId, position } = req.body;
        await pool.query(
            'UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3',
            [columnId, position, id]
        );
        res.json({ message: 'Moved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//แก้ไข Task
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, assigneeId } = req.body;
        const currentUserId = req.user?.id;

        const oldTask = await pool.query(`
            SELECT t.*, c.board_id 
            FROM tasks t 
            JOIN columns c ON t.column_id = c.id 
            WHERE t.id = $1
        `, [id]);

        const oldAssignee = oldTask.rows[0]?.assignee_id;
        const boardId = oldTask.rows[0]?.board_id;

        const result = await pool.query(`
            UPDATE tasks 
            SET title = COALESCE($1, title), 
                assignee_id = $2 
            WHERE id = $3 
            RETURNING *, (SELECT username FROM users WHERE id = assignee_id) as assignee_name
        `, [title, assigneeId, id]);

        //ส่งแจ้งเตือน
        if (assigneeId && assigneeId !== oldAssignee && assigneeId !== currentUserId && boardId) {
            const taskTitle = result.rows[0].title;
            await pool.query(`
                INSERT INTO notifications (user_id, board_id, message) 
                VALUES ($1, $2, $3)
            `, [assigneeId, boardId, `คุณได้รับมอบหมายงาน: "${taskTitle}"`]);
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

//ลบ Task
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;