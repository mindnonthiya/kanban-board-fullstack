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
      ORDER BY t.position ASC, t.id ASC
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
        const { title, description, columnId, assigneeId, priority, dueDate } = req.body;
        const currentUserId = req.user?.id;

        // คำนวณ position ถัดไปในคอลัมน์นี้
        const posResult = await pool.query(
            'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE column_id = $1',
            [columnId]
        );
        const nextPos = posResult.rows[0].next_pos;

        //บันทึก Task
        const result = await pool.query(
            'INSERT INTO tasks (title, description, column_id, assignee_id, priority, due_date, position) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [title, description || '', columnId, assigneeId || currentUserId, priority || 'medium', dueDate || null, nextPos]
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

//ย้ายตำแหน่ง Task แบบ Atomic Transaction พร้อม Normalize Position
router.put('/:id/move', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { columnId, position } = req.body;
        const taskId = parseInt(id);
        const targetColId = parseInt(columnId);
        const targetPos = Math.max(0, parseInt(position) || 0);

        await client.query('BEGIN');

        // 1. ดึงข้อมูลตำแหน่งปัจจุบันของ Task
        const currentTaskRes = await client.query('SELECT id, column_id, position FROM tasks WHERE id = $1', [taskId]);
        if (currentTaskRes.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const currentTask = currentTaskRes.rows[0];
        const oldColId = currentTask.column_id;
        const oldPos = currentTask.position;

        if (oldColId === targetColId) {
            // ย้ายภายในคอลัมน์เดียวกัน
            if (oldPos < targetPos) {
                // เลื่อนลง: ปรับ position ของตัวที่อยู่ระหว่าง oldPos กับ targetPos ขึ้น 1
                await client.query(
                    'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2 AND position <= $3 AND id != $4',
                    [targetColId, oldPos, targetPos, taskId]
                );
            } else if (oldPos > targetPos) {
                // เลื่อนขึ้น: ปรับ position ของตัวที่อยู่ระหว่าง targetPos กับ oldPos ลง 1
                await client.query(
                    'UPDATE tasks SET position = position + 1 WHERE column_id = $1 AND position >= $2 AND position < $3 AND id != $4',
                    [targetColId, targetPos, oldPos, taskId]
                );
            }
            await client.query(
                'UPDATE tasks SET position = $1 WHERE id = $2',
                [targetPos, taskId]
            );
        } else {
            // ย้ายข้ามคอลัมน์
            // 1) จัดการช่องว่างในคอลัมน์เดิม
            await client.query(
                'UPDATE tasks SET position = position - 1 WHERE column_id = $1 AND position > $2',
                [oldColId, oldPos]
            );
            // 2) ขยายช่องว่างในคอลัมน์ปลายทาง
            await client.query(
                'UPDATE tasks SET position = position + 1 WHERE column_id = $1 AND position >= $2',
                [targetColId, targetPos]
            );
            // 3) ย้าย Task ไปยังคอลัมน์ใหม่
            await client.query(
                'UPDATE tasks SET column_id = $1, position = $2 WHERE id = $3',
                [targetColId, targetPos, taskId]
            );
        }

        // Normalize positions ในคอลัมน์ที่เกี่ยวข้องให้เรียง 0, 1, 2, ... อย่างแน่นอนเสมอ
        const affectedCols = oldColId === targetColId ? [targetColId] : [oldColId, targetColId];
        for (const cId of affectedCols) {
            await client.query(`
                WITH reordered AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC, id ASC) - 1 AS new_pos
                    FROM tasks
                    WHERE column_id = $1
                )
                UPDATE tasks t
                SET position = r.new_pos
                FROM reordered r
                WHERE t.id = r.id;
            `, [cId]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Moved successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error moving task:', err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

//แก้ไข Task
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, assigneeId, priority, dueDate } = req.body;
        const currentUserId = req.user?.id;

        const oldTask = await pool.query(`
            SELECT t.*, c.board_id 
            FROM tasks t 
            JOIN columns c ON t.column_id = c.id 
            WHERE t.id = $1
        `, [id]);

        const oldAssignee = oldTask.rows[0]?.assignee_id;
        const boardId = oldTask.rows[0]?.board_id;

        const targetDueDate = dueDate !== undefined ? dueDate : oldTask.rows[0]?.due_date;

        const result = await pool.query(`
            UPDATE tasks 
            SET title = COALESCE($1, title), 
                description = COALESCE($2, description),
                assignee_id = $3,
                priority = COALESCE($4, priority),
                due_date = $5
            WHERE id = $6 
            RETURNING *, (SELECT username FROM users WHERE id = assignee_id) as assignee_name
        `, [title, description, assigneeId, priority, targetDueDate, id]);

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

//ลบ Task พร้อมจัดเรียง position ใหม่
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        await client.query('BEGIN');
        const taskRes = await client.query('SELECT column_id FROM tasks WHERE id = $1', [id]);
        const colId = taskRes.rows[0]?.column_id;

        await client.query('DELETE FROM tasks WHERE id = $1', [id]);

        if (colId) {
            await client.query(`
                WITH reordered AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY position ASC, id ASC) - 1 AS new_pos
                    FROM tasks
                    WHERE column_id = $1
                )
                UPDATE tasks t
                SET position = r.new_pos
                FROM reordered r
                WHERE t.id = r.id;
            `, [colId]);
        }

        await client.query('COMMIT');
        res.json({ message: 'Task deleted' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

export default router;