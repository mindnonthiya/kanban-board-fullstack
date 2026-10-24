import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db';
import authRoutes from './auth';
import boardRoutes from './boards';
import columnRoutes from './columns';
import taskRoutes from './tasks';
import tagRoutes from './tags';
import notificationRoutes from './notifications';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Route ทดสอบ
app.get('/', (req, res) => {
    res.send('Hello! Kanban API is working 🚀');
});

// Route ทดสอบดึงเวลาจาก Database
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            message: 'Database Connected Successfully!',
            time: result.rows[0].now
        });
    } catch (err: any) {
        console.error('Database connection error:', err);
        let debugInfo = 'DATABASE_URL not set';
        if (process.env.DATABASE_URL) {
            try {
                const u = new URL(process.env.DATABASE_URL);
                debugInfo = `user="${u.username}", host="${u.host}", port="${u.port}", passLength=${u.password.length}`;
            } catch (e: any) {
                debugInfo = 'URL parse error: ' + e.message;
            }
        }
        res.status(500).json({ 
            error: 'Database connection failed', 
            details: err?.message || String(err),
            debug: debugInfo
        });
    }
});

app.get('/init-db', async (req, res) => {
    try {
        await initDatabase();
        res.json({ message: 'Database initialized successfully!' });
    } catch (err: any) {
        res.status(500).json({ error: 'Database initialization failed', details: err?.message });
    }
});

// --- ส่วนของ Auth ---
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);

const initDatabase = async () => {
    try {
        //ตาราง Users
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );
    `);

        //ตาราง Boards
        await pool.query(`
      CREATE TABLE IF NOT EXISTS boards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        //ตาราง Columns
        await pool.query(`
      CREATE TABLE IF NOT EXISTS columns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
        position SERIAL
      );
    `);

        //ตาราง Tasks
        await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        column_id INTEGER REFERENCES columns(id) ON DELETE CASCADE,
        position SERIAL,
        assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL 
      );
    `);

        //ตาราง Board Members (สมาชิกในบอร์ด)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS board_members (
        id SERIAL PRIMARY KEY,
        board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(board_id, user_id) -- ห้ามซ้ำ (คนเดิมเข้าบอร์ดเดิมซ้ำไม่ได้)
      );
    `);

        //ตาราง Tags (เก็บชื่อป้ายและสี)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(20) DEFAULT '#E2E8F0',
        board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE
      );
    `);

        //ตาราง Task_Tags (เชื่อมงานกับป้าย - Many-to-Many)
        await pool.query(`
      CREATE TABLE IF NOT EXISTS task_tags (
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, tag_id)
      );
    `);

        //ตาราง Notifications (เพิ่ม board_id)
        // ในไฟล์ server/src/index.ts
        await pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    board_id INTEGER REFERENCES boards(id) ON DELETE CASCADE, 
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

        console.log('✅ Database tables initialized successfully');
    } catch (err) {
        console.error('❌ Failed to initialize database:', err);
    }
};

//เรียกใช้งานฟังก์ชันตอนเริ่ม Server
initDatabase();

//Start Server
app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
});