const API_URL = '/api/products';

let allProducts = [];

window.onload = () => {
    loadInventory();
    document.getElementById('addProductForm').addEventListener('submit', addProduct);
};

async function loadInventory() {
    try {
        const response = await fetch(API_URL);
        allProducts = await response.json();
        displayInventory(allProducts);
        updateStats();
        updateProductSelectors();
        checkLowStockAlert();
    } catch (error) {
        console.error('Error loading inventory', error);
    }
}

function displayInventory(products) {
    const tbody = document.getElementById('inventoryBody');
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">No products in inventory. Add your first product!</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => {
        const status = getStockStatus(product.currentStock, product.reorderLevel);
        return `
            <tr>
                <td><code>${product.sku}</code></td>
                <td><strong>${product.name}</strong></td>
                <td>${product.category}</td>
                <td><small>${product.location || '—'}</small></td>
                <td class="${status === 'critical' ? 'status-critical' : ''}">${product.currentStock}</td>
                <td>${product.reorderLevel}</td>
                <td><span class="status-badge status-${status}">${getStatusText(status)}</span></td>
                <td>$${product.unitPrice?.toFixed(2) || '0'}</td>
                <td>
                    <button class="action-btn" onclick="quickAdjust(${product.id}, 'add')" title="Add Stock">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="action-btn" onclick="quickAdjust(${product.id}, 'remove')" title="Remove Stock">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="action-btn" onclick="quickDelete(${product.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStockStatus(stock, reorderLevel) {
    if (stock <= 0) return 'critical';
    if (stock <= reorderLevel) return 'low';
    return 'ok';
}

function getStatusText(status) {
    if (status === 'critical') return 'CRITICAL';
    if (status === 'low') return 'Low Stock';
    return 'In Stock';
}

async function addProduct(e) {
    e.preventDefault();
    
    const product = {
        sku: document.getElementById('sku').value,
        name: document.getElementById('productName').value,
        category: document.getElementById('category').value,
        location: document.getElementById('location').value,
        currentStock: parseInt(document.getElementById('currentStock').value) || 0,
        reorderLevel: parseInt(document.getElementById('reorderLevel').value) || 10,
        unitPrice: parseFloat(document.getElementById('unitPrice').value) || 0,
        supplier: document.getElementById('supplier').value,
        lastRestocked: new Date().toISOString().split('T')[0]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        
        if (response.ok) {
            showToast(`✅ ${product.name} added to inventory!`);
            document.getElementById('addProductForm').reset();
            loadInventory();
        }
    } catch (error) {
        showToast('Error adding product', 'error');
    }
}

async function adjustStock(action) {
    const productId = document.getElementById('adjustProductSelect').value;
    if (!productId) {
        showToast('Please select a product', 'error');
        return;
    }

    let quantity = parseInt(action === 'add' ? 
        document.getElementById('addStock').value : 
        document.getElementById('removeStock').value);

    if (!quantity || quantity <= 0) {
        showToast('Please enter a valid quantity', 'error');
        return;
    }

    const product = allProducts.find(p => p.id === parseInt(productId));
    if (!product) return;

    let newStock = product.currentStock;
    if (action === 'add') {
        newStock += quantity;
    } else {
        if (quantity > product.currentStock) {
            showToast('Cannot remove more than current stock', 'error');
            return;
        }
        newStock -= quantity;
    }

    const updatedProduct = {
        id: product.id,
        currentStock: newStock,
        lastRestocked: action === 'add' ? new Date().toISOString().split('T')[0] : product.lastRestocked
    };

    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProduct)
        });
        
        if (response.ok) {
            showToast(`Stock ${action === 'add' ? 'increased' : 'decreased'} by ${quantity}`);
            document.getElementById('addStock').value = '';
            document.getElementById('removeStock').value = '';
            loadInventory();
        }
    } catch (error) {
        showToast('Error adjusting stock', 'error');
    }
}

async function updateProductInfo() {
    const productId = document.getElementById('adjustProductSelect').value;
    if (!productId) {
        showToast('Please select a product', 'error');
        return;
    }

    const newPrice = document.getElementById('updatePrice').value;
    const newReorder = document.getElementById('updateReorder').value;

    const updatedProduct = {
        id: parseInt(productId)
    };
    
    if (newPrice) updatedProduct.unitPrice = parseFloat(newPrice);
    if (newReorder) updatedProduct.reorderLevel = parseInt(newReorder);

    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProduct)
        });
        
        if (response.ok) {
            showToast('Product information updated!');
            document.getElementById('updatePrice').value = '';
            document.getElementById('updateReorder').value = '';
            loadInventory();
        }
    } catch (error) {
        showToast('Error updating product', 'error');
    }
}

async function deleteProduct() {
    const productId = document.getElementById('adjustProductSelect').value;
    if (!productId) {
        showToast('Please select a product', 'error');
        return;
    }

    const product = allProducts.find(p => p.id === parseInt(productId));
    
    if (confirm(`Delete ${product?.name} from inventory?`)) {
        try {
            const response = await fetch(`${API_URL}/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast(`🗑️ ${product?.name} removed from inventory`);
                loadInventory();
                document.getElementById('adjustProductSelect').value = '';
                document.getElementById('productDetails').innerHTML = '<p class="placeholder">Select a product to adjust stock</p>';
            }
        } catch (error) {
            showToast('Error deleting product', 'error');
        }
    }
}

async function quickAdjust(productId, action) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const quantity = prompt(`Enter quantity to ${action === 'add' ? 'add to' : 'remove from'} ${product.name}:`, '1');
    if (!quantity || isNaN(quantity)) return;

    let newStock = product.currentStock;
    if (action === 'add') {
        newStock += parseInt(quantity);
    } else {
        if (parseInt(quantity) > product.currentStock) {
            showToast('Cannot remove more than current stock', 'error');
            return;
        }
        newStock -= parseInt(quantity);
    }

    const updatedProduct = {
        id: product.id,
        currentStock: newStock,
        lastRestocked: action === 'add' ? new Date().toISOString().split('T')[0] : product.lastRestocked
    };

    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProduct)
        });
        
        if (response.ok) {
            showToast(`Stock updated for ${product.name}`);
            loadInventory();
        }
    } catch (error) {
        showToast('Error updating stock', 'error');
    }
}

async function quickDelete(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (confirm(`Delete ${product?.name} permanently?`)) {
        try {
            const response = await fetch(`${API_URL}/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast(`${product?.name} removed`);
                loadInventory();
            }
        } catch (error) {
            showToast('Error deleting', 'error');
        }
    }
}

async function loadProductForAdjustment() {
    const productId = document.getElementById('adjustProductSelect').value;
    if (!productId) {
        document.getElementById('productDetails').innerHTML = '<p class="placeholder">Select a product to adjust stock</p>';
        return;
    }

    const product = allProducts.find(p => p.id === parseInt(productId));
    if (product) {
        document.getElementById('productDetails').innerHTML = `
            <div class="product-info-preview">
                <div><strong>${product.name}</strong></div>
                <div>SKU: ${product.sku}</div>
                <div>Current Stock: ${product.currentStock}</div>
                <div>Reorder Level: ${product.reorderLevel}</div>
                <div>Price: $${product.unitPrice?.toFixed(2)}</div>
            </div>
        `;
    }
}

function updateStats() {
    const totalProducts = allProducts.length;
    const lowStockCount = allProducts.filter(p => p.currentStock <= p.reorderLevel).length;
    const totalValue = allProducts.reduce((sum, p) => sum + (p.currentStock * (p.unitPrice || 0)), 0);
    
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('lowStockCount').textContent = lowStockCount;
    document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString()}`;
}

function updateProductSelectors() {
    const select = document.getElementById('adjustProductSelect');
    const filterSelect = document.getElementById('categoryFilter');
    
    const options = allProducts.map(p => `<option value="${p.id}">#${p.id} - ${p.name} (Stock: ${p.currentStock})</option>`).join('');
    select.innerHTML = '<option value="">Choose a product...</option>' + options;
    
    const categories = [...new Set(allProducts.map(p => p.category))];
    filterSelect.innerHTML = '<option value="all">All Categories</option>' + 
        categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.sku.toLowerCase().includes(searchTerm) || 
        p.name.toLowerCase().includes(searchTerm)
    );
    displayInventory(filtered);
}

function filterByCategory() {
    const category = document.getElementById('categoryFilter').value;
    if (category === 'all') {
        displayInventory(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category === category);
        displayInventory(filtered);
    }
}

function refreshInventory() {
    loadInventory();
    showToast('Inventory refreshed');
}

function checkLowStockAlert() {
    const lowStock = allProducts.filter(p => p.currentStock <= p.reorderLevel && p.currentStock > 0);
    const critical = allProducts.filter(p => p.currentStock === 0);
    
    if (critical.length > 0) {
        showAlert(`⚠️ CRITICAL: ${critical.length} product(s) out of stock!`);
    } else if (lowStock.length > 0) {
        showAlert(`📦 Alert: ${lowStock.length} product(s) below reorder level`);
    }
}

function showAlert(message) {
    const banner = document.getElementById('alertBanner');
    const span = document.getElementById('alertMessage');
    span.textContent = message;
    banner.style.display = 'flex';
    setTimeout(() => {
        hideAlert();
    }, 8000);
}

function hideAlert() {
    document.getElementById('alertBanner').style.display = 'none';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}