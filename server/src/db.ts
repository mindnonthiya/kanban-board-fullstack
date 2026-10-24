import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ตั้งค่าการเชื่อมต่อ รองรับทั้ง Cloud (DATABASE_URL) และ Local / Docker
const poolConfig: PoolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    }
    : {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME,
    };

export const pool = new Pool(poolConfig);

//ดักฟัง event ว่าเชื่อมต่อสำเร็จไหม
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
});