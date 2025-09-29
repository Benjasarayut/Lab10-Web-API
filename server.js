require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ใช้ MySQL ของ XAMPP
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'lab10_airline',
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true
});

// Root – metadata
app.get('/', (_req, res) => {
  res.json({
    service: 'Lab10 Web API',
    endpoints: {
      list: 'GET /products',
      getOne: 'GET /products/:id',
      create: 'POST /products',
      update: 'PUT /products/:id',
      remove: 'DELETE /products/:id',
      health: 'GET /health'
    }
  });
});

// Health – เช็ค DB ของ XAMPP
app.get('/health', async (_req, res) => {
  try {
    const [r] = await pool.query('SELECT 1 AS ok, DATABASE() AS db');
    res.json({ ok: r[0].ok === 1, db: r[0].db });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /products – ทั้งหมด
app.get('/products', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /products/:id – ทีละรายการ
app.get('/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /products – เพิ่มสินค้า
app.post('/products', async (req, res) => {
  try {
    const { name, manufacturer, type, first_flight_year, capacity, max_speed_kmh, price, image_url, description } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const sql = `INSERT INTO products
      (name, manufacturer, type, first_flight_year, capacity, max_speed_kmh, price, image_url, description)
      VALUES (?,?,?,?,?,?,?,?,?)`;

    const [result] = await pool.query(sql, [
      name, manufacturer, type, first_flight_year, capacity, max_speed_kmh, price ?? 0, image_url, description
    ]);

    const [rows] = await pool.query('SELECT * FROM products WHERE id=?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /products/:id – แก้ไขสินค้า
app.put('/products/:id', async (req, res) => {
  try {
    const { name, manufacturer, type, first_flight_year, capacity, max_speed_kmh, price, image_url, description } = req.body || {};

    const sql = `UPDATE products SET
      name=?, manufacturer=?, type=?, first_flight_year=?, capacity=?, max_speed_kmh=?, price=?, image_url=?, description=?
      WHERE id=?`;

    const [result] = await pool.query(sql, [
      name, manufacturer, type, first_flight_year, capacity, max_speed_kmh, price, image_url, description, req.params.id
    ]);

    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });

    const [rows] = await pool.query('SELECT * FROM products WHERE id=?', [req.params.id]);
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /products/:id – ลบสินค้า
app.delete('/products/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM products WHERE id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Deleted', id: Number(req.params.id) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// JSON 404
app.use((_req, res) => res.status(404).json({ message: 'Not Found' }));

app.listen(PORT, () => console.log(`✅ JSON API on http://localhost:3000/products`));
