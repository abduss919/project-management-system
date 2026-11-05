const API_BASE = 'http://localhost:5000/api';

const form = document.getElementById('productForm');
const formHeading = document.getElementById('formHeading');
const productIdInput = document.getElementById('productId');
const projectNameInput = document.getElementById('projectName');
const categoryInput = document.getElementById('category');
const priceInput = document.getElementById('price');
const quantityInput = document.getElementById('quantity');
const reorderLevelInput = document.getElementById('reorderLevel');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const tableBody = document.getElementById('productTableBody');

const statTotalProducts = document.getElementById('statTotalProducts');
const statTotalCategories = document.getElementById('statTotalCategories');
const statTotalQuantity = document.getElementById('statTotalQuantity');
const statTotalValue = document.getElementById('statTotalValue');
const statLowStock = document.getElementById('statLowStock');

document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardStats();
    fetchProducts();

    form.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
    searchInput.addEventListener('input', () => fetchProducts());
    categoryFilter.addEventListener('change', () => fetchProducts());
});

async function fetchDashboardStats() {
    try {
        const res = await fetch(`${API_BASE}/dashboard`);
        const data = await res.json();
        statTotalProducts.textContent = data.totalProducts;
        statTotalCategories.textContent = data.totalCategories;
        statTotalQuantity.textContent = data.totalQuantity;
        statTotalValue.textContent = `₹${data.totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        statLowStock.textContent = data.lowStockCount;
    } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
    }
}

async function fetchProducts() {
    const search = searchInput.value;
    const category = categoryFilter.value;
    const url = new URL(`${API_BASE}/products`);

    if (search) url.searchParams.append('search', search);
    if (category && category !== 'All') url.searchParams.append('category', category);

    try {
        const res = await fetch(url);
        const products = await res.json();
        renderTable(products);
        populateCategoryDropdown(products);
    } catch (err) {
        console.error('Failed to fetch products:', err);
    }
}

function renderTable(products) {
    tableBody.innerHTML = '';

    if (products.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #64748b; padding: 20px;">No products found.</td></tr>`;
        return;
    }

    products.forEach(p => {
        const isLow = p.quantity <= p.reorder_level;
        const statusBadge = isLow
            ? `<span class="badge badge-low">Low Stock / Reorder</span>`
            : `<span class="badge badge-ok">In Stock</span>`;

        const totalVal = (Number(p.price) * Number(p.quantity)).toFixed(2);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.id}</td>
            <td><strong>${p.project_name}</strong></td>
            <td>${p.category}</td>
            <td>₹${Number(p.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>${p.quantity}</td>
            <td>${p.reorder_level}</td>
            <td>₹${Number(totalVal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-edit" onclick="startEdit(${p.id})">Edit</button>
                <button class="btn btn-delete" onclick="deleteProduct(${p.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function populateCategoryDropdown(products) {
    const selected = categoryFilter.value;
    const categories = new Set();
    products.forEach(p => categories.add(p.category));

    categoryFilter.innerHTML = '<option value="All">All Categories</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        if (cat === selected) opt.selected = true;
        categoryFilter.appendChild(opt);
    });
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const payload = {
        project_name: projectNameInput.value,
        category: categoryInput.value,
        price: parseFloat(priceInput.value),
        quantity: parseInt(quantityInput.value, 10),
        reorder_level: parseInt(reorderLevelInput.value, 10)
    };

    const id = productIdInput.value;
    const isEdit = Boolean(id);

    try {
        const res = await fetch(isEdit ? `${API_BASE}/products/${id}` : `${API_BASE}/products`, {
            method: isEdit ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            alert(`Error: ${err.error}`);
            return;
        }

        resetForm();
        fetchProducts();
        fetchDashboardStats();
    } catch (err) {
        console.error('Submit error:', err);
    }
}

async function startEdit(id) {
    try {
        const res = await fetch(`${API_BASE}/products/${id}`);
        const p = await res.json();

        productIdInput.value = p.id;
        projectNameInput.value = p.project_name;
        categoryInput.value = p.category;
        priceInput.value = p.price;
        quantityInput.value = p.quantity;
        reorderLevelInput.value = p.reorder_level;

        formHeading.textContent = `Update Product (ID: ${p.id})`;
        saveBtn.textContent = 'Update Product';
        cancelBtn.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error('Edit fetch error:', err);
    }
}

async function deleteProduct(id) {
    if (!confirm(`Are you sure you want to delete product ID: ${id}?`)) return;

    try {
        const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchProducts();
            fetchDashboardStats();
        }
    } catch (err) {
        console.error('Delete error:', err);
    }
}

function resetForm() {
    productIdInput.value = '';
    form.reset();
    formHeading.textContent = 'Add New Product / Project';
    saveBtn.textContent = 'Save Product';
    cancelBtn.style.display = 'none';
}