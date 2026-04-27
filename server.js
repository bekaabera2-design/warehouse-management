const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    
    if (req.url === '/' && req.method === 'GET') {
        const htmlPath = path.join(__dirname, 'index.html');
        fs.readFile(htmlPath, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading page');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }
    
    else if (req.url === '/css/style.css' && req.method === 'GET') {
        const cssPath = path.join(__dirname, 'css', 'style.css');
        fs.readFile(cssPath, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('CSS not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end(data);
            }
        });
    }
    
    else if (req.url === '/js/script.js' && req.method === 'GET') {
        const jsPath = path.join(__dirname, 'js', 'script.js');
        fs.readFile(jsPath, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('JS not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(data);
            }
        });
    }
    
    
    else if (req.url === '/api/products' && req.method === 'GET') {
        (async () => {
            const products = await getProducts();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(products));
        })();
    }
    

    else if (req.url.startsWith('/api/products/') && req.method === 'GET') {
        (async () => {
            const productId = req.url.split('/')[3];
            const products = await getProducts();
            const product = products.find(p => p.id === parseInt(productId));
            if (product) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(product));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Product not found' }));
            }
        })();
    }
    
    
    else if (req.url === '/api/products/low-stock' && req.method === 'GET') {
        (async () => {
            const products = await getProducts();
            const lowStock = products.filter(p => p.currentStock <= p.reorderLevel);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(lowStock));
        })();
    }
    

    else if (req.url === '/api/products' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const newProduct = JSON.parse(body);
                const addedProduct = await addProduct(newProduct);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(addedProduct));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    

    else if (req.url === '/api/products' && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const updatedProduct = JSON.parse(body);
                const result = await updateProduct(updatedProduct);
                if (result) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Product not found' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    
    
    else if (req.url.startsWith('/api/products/') && req.method === 'DELETE') {
        (async () => {
            const productId = req.url.split('/')[3];
            const result = await deleteProduct(parseInt(productId));
            if (result) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Product not found' }));
            }
        })();
    }
    
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Route Not Found' }));
    }
});


const getProducts = async () => {
    const productsPath = path.join(__dirname, 'data', 'products.json');
    const data = await fs.promises.readFile(productsPath, 'utf-8');
    return JSON.parse(data);
};

const addProduct = async (product) => {
    const productsPath = path.join(__dirname, 'data', 'products.json');
    const data = await fs.promises.readFile(productsPath, 'utf-8');
    const products = JSON.parse(data);
    const newId = products.length > 0 ? products[products.length - 1].id + 1 : 1;
    product.id = newId;
    product.createdAt = new Date().toISOString();
    products.push(product);
    await fs.promises.writeFile(productsPath, JSON.stringify(products, null, 2));
    return product;
};

const updateProduct = async (product) => {
    const productsPath = path.join(__dirname, 'data', 'products.json');
    const data = await fs.promises.readFile(productsPath, 'utf-8');
    const products = JSON.parse(data);
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
        products[index] = { ...products[index], ...product };
        await fs.promises.writeFile(productsPath, JSON.stringify(products, null, 2));
        return products[index];
    }
    return null;
};

const deleteProduct = async (id) => {
    const productsPath = path.join(__dirname, 'data', 'products.json');
    const data = await fs.promises.readFile(productsPath, 'utf-8');
    const products = JSON.parse(data);
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
        const deletedProduct = products.splice(index, 1)[0];
        await fs.promises.writeFile(productsPath, JSON.stringify(products, null, 2));
        return deletedProduct;
    }
    return null;
};

const PORT = 3002;
server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`📦 SMART WAREHOUSE INVENTORY API`);
    console.log(`========================================`);
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📁 API Base: http://localhost:${PORT}/api/products`);
    console.log(`========================================`);
    console.log(`🎯 Available Endpoints:`);
    console.log(`   GET    /api/products`);
    console.log(`   GET    /api/products/{id}`);
    console.log(`   GET    /api/products/low-stock`);
    console.log(`   POST   /api/products`);
    console.log(`   PUT    /api/products`);
    console.log(`   DELETE /api/products/{id}`);
    console.log(`========================================`);
});