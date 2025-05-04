document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const loginModal = document.getElementById('login-modal');
    const adminDashboard = document.getElementById('admin-dashboard');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const passwordInput = document.getElementById('password');
    const loginError = document.getElementById('login-error');
    const productModal = document.getElementById('product-modal');
    const deleteModal = document.getElementById('delete-modal');
    const notificationModal = document.getElementById('notification-modal');
    const addProductButton = document.getElementById('add-product-button');
    const addFirstProductButton = document.getElementById('add-first-product');
    const productsTableContainer = document.getElementById('products-table-container');
    const productsTableBody = document.getElementById('products-table-body');
    const noProducts = document.getElementById('no-products');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const productForm = document.getElementById('product-form');
    const productModalTitle = document.getElementById('product-modal-title');
    const closeProductModal = document.getElementById('close-product-modal');
    const cancelProduct = document.getElementById('cancel-product');
    const saveProduct = document.getElementById('save-product');
    const closeDeleteModal = document.getElementById('close-delete-modal');
    const cancelDelete = document.getElementById('cancel-delete');
    const confirmDelete = document.getElementById('confirm-delete');
    const closeNotificationModal = document.getElementById('close-notification-modal');
    const notificationOk = document.getElementById('notification-ok');
    const notificationTitle = document.getElementById('notification-title');
    const notificationMessage = document.getElementById('notification-message');
    const productImage = document.getElementById('product-image');
    const imagePreview = document.getElementById('image-preview');
    const imagePreviewContainer = document.querySelector('.image-preview-container');
    const productCategories = document.getElementById('product-categories');

    // State
    let products = [];
    let currentProductId = null;
    let isAuthenticated = false;

    // Check if user is authenticated (from localStorage)
    function checkAuth() {
        isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
        if (isAuthenticated) {
            loginModal.classList.remove('show');
            adminDashboard.style.display = 'block';
            loadProducts();
        }
    }

    // Login
    async function login() {
        const password = passwordInput.value;
        
        try {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                localStorage.setItem('adminAuthenticated', 'true');
                isAuthenticated = true;
                loginModal.classList.remove('show');
                adminDashboard.style.display = 'block';
                loadProducts();
            } else {
                loginError.style.display = 'flex';
                setTimeout(() => {
                    loginError.style.display = 'none';
                }, 3000);
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Error', 'No se pudo establecer conexión con el servidor.');
        }
    }

    // Logout
    function logout() {
        localStorage.removeItem('adminAuthenticated');
        isAuthenticated = false;
        adminDashboard.style.display = 'none';
        loginModal.classList.add('show');
        passwordInput.value = '';
    }

    // Load products from the server
    async function loadProducts() {
        if (!isAuthenticated) return;
        
        loading.style.display = 'flex';
        errorMessage.style.display = 'none';
        productsTableContainer.style.display = 'none';
        noProducts.style.display = 'none';
        
        try {
            const response = await fetch('/api/products');
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            products = await response.json();
            
            if (products.length === 0) {
                noProducts.style.display = 'flex';
            } else {
                renderProductsTable();
                productsTableContainer.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading products:', error);
            errorMessage.style.display = 'flex';
        } finally {
            loading.style.display = 'none';
        }
    }

    // Render products table
    function renderProductsTable() {
        productsTableBody.innerHTML = '';
        
        products.forEach(product => {
            const row = document.createElement('tr');
            
            // Convert price to a nicely formatted string
            const formattedPrice = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'CLP'
            }).format(product.price);
            
            row.innerHTML = `
                <td>${product.id}</td>
                <td>
                    <img src="${product.image || 'placeholder.jpg'}" alt="${product.name}" class="product-thumbnail">
                </td>
                <td>${product.name}</td>
                <td>${formattedPrice}</td>
                <td>
                    <div class="product-categories">
                        ${product.categories && product.categories.map(category => 
                            `<span class="badge badge-category">${category}</span>`).join(' ') || ''}
                    </div>
                </td>
                <td>
                    <div class="product-tags">
                        ${product.tags && product.tags.map(tag => 
                            `<span class="badge badge-brand">${tag}</span>`).join(' ') || ''}
                    </div>
                </td>
                <td class="table-actions">
                    <button class="btn btn-sm btn-outline edit-product" data-id="${product.id}">Editar</button>
                    <button class="btn btn-sm btn-danger delete-product" data-id="${product.id}">Eliminar</button>
                </td>
            `;
            
            productsTableBody.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-product').forEach(button => {
            button.addEventListener('click', () => openEditProductModal(parseInt(button.dataset.id)));
        });
        
        document.querySelectorAll('.delete-product').forEach(button => {
            button.addEventListener('click', () => openDeleteModal(parseInt(button.dataset.id)));
        });
    }

    // Open add product modal
    function openAddProductModal() {
        productForm.reset();
        currentProductId = null;
        productModalTitle.textContent = 'Añadir Producto';
        imagePreviewContainer.style.display = 'none';
        productModal.classList.add('show');
        // Reset file input to ensure no cached file selection
        productImage.value = '';
    }

    // Open edit product modal
    function openEditProductModal(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        currentProductId = productId;
        
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-description').value = product.description;
        
        // Fill categories field
        if (product.categories && Array.isArray(product.categories)) {
            document.getElementById('product-categories').value = product.categories.join(', ');
        } else {
            document.getElementById('product-categories').value = '';
        }
        
        // Fill tags field (brands)
        if (product.tags && Array.isArray(product.tags)) {
            document.getElementById('product-tags').value = product.tags.join(', ');
        } else {
            document.getElementById('product-tags').value = '';
        }
        
        // Reset file input to ensure no cached file selection
        productImage.value = '';
        
        // Show image preview if available
        if (product.image) {
            imagePreview.src = product.image;
            imagePreviewContainer.style.display = 'block';
        } else {
            imagePreviewContainer.style.display = 'none';
        }
        
        productModalTitle.textContent = 'Editar Producto';
        productModal.classList.add('show');
    }

    // Open delete confirmation modal
    function openDeleteModal(productId) {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        
        currentProductId = productId;
        
        document.getElementById('delete-product-image').src = product.image || 'placeholder.jpg';
        document.getElementById('delete-product-name').textContent = product.name;
        document.getElementById('delete-product-price').textContent = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'CLP'
        }).format(product.price);
        
        deleteModal.classList.add('show');
    }

    // Show notification modal
    function showNotification(title, message) {
        notificationTitle.textContent = title;
        notificationMessage.textContent = message;
        notificationModal.classList.add('show');
    }

    // Save product (add or update)
    async function saveProductData() {
        if (!isAuthenticated) return;
        
        try {
            const formData = new FormData(productForm);
            
            // If editing a product, use PUT method
            let url = '/api/products';
            let method = 'POST';
            
            if (currentProductId) {
                url = `/api/products/${currentProductId}`;
                method = 'PUT';
                
                // Check if image input is empty (no new file selected)
                if (!productImage.files || !productImage.files[0]) {
                    // Remove the empty image field to prevent overwriting existing image
                    formData.delete('image');
                }
            }
            
            console.log(`Submitting ${method} request to ${url}`);
            
            const response = await fetch(url, {
                method: method,
                body: formData
            });
            
            if (!response.ok) {
                const responseData = await response.json();
                throw new Error(responseData.error || `HTTP error! Status: ${response.status}`);
            }
            
            const responseData = await response.json();
            
            // Close modal and reload products
            productModal.classList.remove('show');
            await loadProducts();
            
            // Only show notification for adding products, not for editing
            if (!currentProductId) {
                showNotification('Éxito', 'Producto añadido correctamente.');
            } else {
                showNotification('Éxito', 'Producto actualizado correctamente.');
            }
        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Error', `No se pudo guardar el producto: ${error.message}`);
        }
    }

    // Delete product
    async function deleteProduct() {
        if (!isAuthenticated || !currentProductId) return;
        
        try {
            const response = await fetch(`/api/products/${currentProductId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Close modal and reload products
            deleteModal.classList.remove('show');
            await loadProducts();
            
            showNotification('Éxito', 'Producto eliminado correctamente.');
        } catch (error) {
            console.error('Error deleting product:', error);
            showNotification('Error', 'No se pudo eliminar el producto. Por favor, intenta de nuevo.');
        }
    }

    // Event Listeners
    loginButton.addEventListener('click', login);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    logoutButton.addEventListener('click', logout);
    
    addProductButton.addEventListener('click', openAddProductModal);
    addFirstProductButton.addEventListener('click', openAddProductModal);
    
    closeProductModal.addEventListener('click', () => productModal.classList.remove('show'));
    cancelProduct.addEventListener('click', () => productModal.classList.remove('show'));
    saveProduct.addEventListener('click', saveProductData);
    
    closeDeleteModal.addEventListener('click', () => deleteModal.classList.remove('show'));
    cancelDelete.addEventListener('click', () => deleteModal.classList.remove('show'));
    confirmDelete.addEventListener('click', deleteProduct);
    
    closeNotificationModal.addEventListener('click', () => notificationModal.classList.remove('show'));
    notificationOk.addEventListener('click', () => notificationModal.classList.remove('show'));

    // Image preview functionality
    productImage.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreviewContainer.style.display = 'none';
        }
    });

    // Initialize
    checkAuth();
});
