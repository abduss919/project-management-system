const express = require('express');
const router = express.Router();
const db = require('../db');

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
    try {
        const [countRows] = await db.query('SELECT COUNT(*) AS totalProducts FROM products');
        const [categoryRows] = await db.query('SELECT COUNT(DISTINCT category) AS totalCategories FROM products');
        const [sumRows] = await db.query('SELECT IFNULL(SUM(quantity), 0) AS totalQuantity, IFNULL(SUM(price * quantity), 0.00) AS totalStockValue FROM products');
        const [lowStockRows] = await db.query('SELECT COUNT(*) AS lowStockCount FROM products WHERE quantity <= reorder_level');

        res.json({
            totalProducts: countRows[0].totalProducts,
            totalCategories: categoryRows[0].totalCategories,
            totalQuantity: sumRows[0].totalQuantity,
            totalStockValue: parseFloat(sumRows[0].totalStockValue),
            lowStockCount: lowStockRows[0].lowStockCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all products
router.get('/products', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = 'SELECT *, (price * quantity) AS total_value FROM products WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND project_name LIKE ?';
            params.push(`%${search.trim()}%`);
        }

        if (category && category !== 'All') {
            query += ' AND category = ?';
            params.push(category.trim());
        }

        query += ' ORDER BY id DESC';
        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single product by id
router.get('/products/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add new product
router.post('/products', async (req, res) => {
    try {
        const { project_name, category, price, quantity, reorder_level } = req.body;
        if (!project_name || !category || price === undefined || quantity === undefined || reorder_level === undefined) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const [result] = await db.query(
            'INSERT INTO products (project_name, category, price, quantity, reorder_level) VALUES (?, ?, ?, ?, ?)',
            [project_name.trim(), category.trim(), parseFloat(price), parseInt(quantity, 10), parseInt(reorder_level, 10)]
        );

        res.status(201).json({ message: 'Product added successfully', productId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update product
router.put('/products/:id', async (req, res) => {
    try {
        const { project_name, category, price, quantity, reorder_level } = req.body;
        const [result] = await db.query(
            'UPDATE products SET project_name = ?, category = ?, price = ?, quantity = ?, reorder_level = ? WHERE id = ?',
            [project_name.trim(), category.trim(), parseFloat(price), parseInt(quantity, 10), parseInt(reorder_level, 10), req.params.id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product
router.delete('/products/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;