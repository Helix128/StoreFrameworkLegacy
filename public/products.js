document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('products-container');
    const loadingElement = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const searchInput = document.getElementById('product-search');
    const searchButton = document.getElementById('search-button');
    const tagFiltersContainer = document.getElementById('tag-filters');
    const categoryFiltersContainer = document.getElementById('category-filters');
    const clearFiltersButton = document.getElementById('clear-filters');
    const sortDirectionBtn = document.getElementById('sort-direction');

    let allProducts = [];
    let activeBrandFilters = [];
    let activeCategoryFilters = [];
    let lastFilteredResults = null;
    let lastSearchTerm = '';
    let lastBrandFilterSet = [];
    let lastCategoryFilterSet = [];
    let brandsCreated = false;
    let categoriesCreated = false;
    let isAscending = true; // Default to ascending (A-Z)

    // Function to fetch products from JSON file
    async function fetchProducts() {
        console.log('Fetching products from server...');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch('products.json', {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const products = await response.json();
            console.log('Products fetched successfully.');
            return products;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error; // Re-throw the error to be caught by the caller
        }
    }

    // Function to create product card HTML
    function createProductCard(product, index) {
        const description = product.description.length > 120 ? 
            product.description.substring(0, 120) + '...' : 
            product.description;
            
        // Use placeholder.jpg if image is missing or empty
        const imageSrc = product.image ? product.image : 'placeholder.jpg';
            
        return `
            <div class="card product-card" style="animation-delay: ${index * 100}ms;">
            ${tagBadge(product,"trending")}
                <div class="card-img-container">
                    <img src="${imageSrc}" alt="${product.name}" class="card-img" onerror="this.src='placeholder.jpg'">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${product.name}</h3>
                    <div class="product-tags">
                        ${product.categories && product.categories.length ? 
                            product.categories.map(category => 
                                `<span class="badge badge-category">${category}</span>`
                            ).join('') : ''}
                        ${product.tags && product.tags.length ? 
                            product.tags.map(tag => 
                                `<span class="badge badge-brand">${tag}</span>`
                            ).join('') : ''}
                    </div>
                </div>
                <div class="card-footer">
                    <div class="card-actions">
                        <button class="btn btn-outline btn-sm details-button" data-product-index="${index}">Detalles</button>
                    </div>
                </div>
            </div> 
        `;
    }

    function tagBadge(product, tag){
        if (product.tags.includes(tag)) {
            return `<div class="product-badge badge badge-new">Trending</div>`;
        } else {
            return '';
        }
    }

    // Function to extract all unique tags (brands)
    function extractUniqueTags(products) {
        const allTags = new Set();
        products.forEach(product => {
            if (product.tags) {
                product.tags.forEach(tag => allTags.add(tag));
            }
        });
        return Array.from(allTags).sort();
    }

    // Function to extract all unique categories
    function extractUniqueCategories(products) {
        const allCategories = new Set();
        products.forEach(product => {
            if (product.categories) {
                product.categories.forEach(category => allCategories.add(category));
            }
        });
        return Array.from(allCategories).sort();
    }

    // Function to create brand filters
    function createBrandFilters(tags) {
        if (brandsCreated) return;

        tagFiltersContainer.innerHTML = '';
        tags.forEach(tag => {
            if(tag === "trending") return;

            const filterId = `brand-filter-${tag.replace(/\s+/g, '-')}`; // Create unique ID

            const filterWrapper = document.createElement('div');
            filterWrapper.classList.add('filter-item');

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = filterId;
            input.classList.add('filter-checkbox');
            input.dataset.tag = tag;

            const label = document.createElement('label');
            label.htmlFor = filterId;
            label.classList.add('filter-label');
            label.textContent = tag;

            // Add click event listener to the wrapper (or input/label)
            filterWrapper.addEventListener('click', (e) => {
                // Prevent double toggling if clicking directly on checkbox/label
                if (e.target !== input && e.target !== label) {
                    input.checked = !input.checked;
                }
                
                // Update active filters based on checkbox state
                if (input.checked) {
                    activeBrandFilters.push(tag);
                } else {
                    activeBrandFilters = activeBrandFilters.filter(t => t !== tag);
                }
                
                // Apply filters immediately after change
                filterAndDisplayProducts();
            });
            
            // Handle direct clicks on checkbox
            input.addEventListener('change', () => {
                 if (input.checked) {
                    if (!activeBrandFilters.includes(tag)) activeBrandFilters.push(tag);
                } else {
                    activeBrandFilters = activeBrandFilters.filter(t => t !== tag);
                }
                filterAndDisplayProducts();
            });


            filterWrapper.appendChild(input);
            filterWrapper.appendChild(label);
            tagFiltersContainer.appendChild(filterWrapper);
        });
        brandsCreated = true;
    }

    // Function to create category filters
    function createCategoryFilters(categories) {
        if (categoriesCreated) return;

        categoryFiltersContainer.innerHTML = '';
        categories.forEach(category => {
            const filterId = `category-filter-${category.replace(/\s+/g, '-')}`; // Create unique ID

            const filterWrapper = document.createElement('div');
            filterWrapper.classList.add('filter-item');

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = filterId;
            input.classList.add('filter-checkbox');
            input.dataset.category = category;

            const label = document.createElement('label');
            label.htmlFor = filterId;
            label.classList.add('filter-label');
            label.textContent = category;

            // Add click event listener to the wrapper (or input/label)
             filterWrapper.addEventListener('click', (e) => {
                // Prevent double toggling if clicking directly on checkbox/label
                if (e.target !== input && e.target !== label) {
                    input.checked = !input.checked;
                }
                
                // Update active filters based on checkbox state
                if (input.checked) {
                    activeCategoryFilters.push(category);
                } else {
                    activeCategoryFilters = activeCategoryFilters.filter(c => c !== category);
                }
                
                // Apply filters immediately after change
                filterAndDisplayProducts();
            });
            
            // Handle direct clicks on checkbox
            input.addEventListener('change', () => {
                 if (input.checked) {
                    if (!activeCategoryFilters.includes(category)) activeCategoryFilters.push(category);
                } else {
                    activeCategoryFilters = activeCategoryFilters.filter(c => c !== category);
                }
                filterAndDisplayProducts();
            });

            filterWrapper.appendChild(input);
            filterWrapper.appendChild(label);
            categoryFiltersContainer.appendChild(filterWrapper);
        });
        categoriesCreated = true;
        
        // Show the clear filters button after filters are created
        if (categories.length > 0 || brandsCreated) {
            clearFiltersButton.style.display = 'inline-block';
        }
    }

    // Function to filter products with memoization
    function filterProducts(products, searchTerm, brandFilters, categoryFilters) {
        if (lastFilteredResults && 
            searchTerm === lastSearchTerm && 
            JSON.stringify(brandFilters) === JSON.stringify(lastBrandFilterSet) &&
            JSON.stringify(categoryFilters) === JSON.stringify(lastCategoryFilterSet)) {
            return lastFilteredResults;
        }
        
        const filtered = products.filter(product => {
            const searchMatch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Changed from every() to some() for additive filtering
            // If no brand filters are active, show all products
            // If brand filters are active, show products with ANY of those brands
            const brandMatch = brandFilters.length === 0 || 
                brandFilters.some(tag => product.tags && product.tags.includes(tag));
            
            // Changed from every() to some() for additive filtering
            // If no category filters are active, show all products
            // If category filters are active, show products with ANY of those categories
            const categoryMatch = categoryFilters.length === 0 || 
                categoryFilters.some(category => product.categories && product.categories.includes(category));
            
            return searchMatch && brandMatch && categoryMatch;
        });
        
        lastFilteredResults = filtered;
        lastSearchTerm = searchTerm;
        lastBrandFilterSet = [...brandFilters];
        lastCategoryFilterSet = [...categoryFilters];
        
        return filtered;
    }

    // Function to sort products
    function sortProducts(products) {
        const sortedProducts = [...products];
        
        // Always sort alphabetically, only direction changes
        sortedProducts.sort((a, b) => {
            return isAscending ? 
                a.name.localeCompare(b.name) : 
                b.name.localeCompare(a.name);
        });
        
        return sortedProducts;
    }

    // Function to filter and display products
    function filterAndDisplayProducts() {
        if (!allProducts || allProducts.length === 0) {
            displayInitialMessage();
            return;
        }

        const searchTerm = searchInput.value.trim();
        const filteredProducts = filterProducts(allProducts, searchTerm, activeBrandFilters, activeCategoryFilters);
        
        // Sort the filtered products
        const sortedProducts = sortProducts(filteredProducts);

        displayProducts(sortedProducts);

        if (sortedProducts.length === 0) {
            productsContainer.innerHTML = `
                <div class="no-results">
                    <p>No se encontraron productos que coincidan con tu búsqueda o filtros.</p>
                </div>
            `;
        }
    }

    // Function to display products
    function displayProducts(products) {
        productsContainer.innerHTML = '';
        
        products.forEach((product, index) => {
            const productHTML = createProductCard(product, index);
            productsContainer.innerHTML += productHTML;
        });
        
        // Add event listeners to all details buttons after products are displayed
        document.querySelectorAll('.details-button').forEach(button => {
            button.addEventListener('click', function() {
                const productIndex = parseInt(this.getAttribute('data-product-index'));
                showProductDetails(products[productIndex]);
            });
        });
    }

    // Function to show product details in modal
    function showProductDetails(product) {
        const modalTitle = document.getElementById('modal-product-title');
        const modalContent = document.getElementById('modal-product-content');
        const modal = document.getElementById('product-modal');
        
        // Set the modal title
        modalTitle.textContent = product.name;
        
        // Create the product details HTML
        const imageSrc = product.image ? product.image : 'placeholder.jpg';
        
        const productDetailsHTML = `
            <div class="product-detail-container">
                <div>
                    <img src="${imageSrc}" alt="${product.name}" class=product-detail-image onerror="this.src='placeholder.jpg'">
                </div>
                <div class="product-detail-info">
                <br>
                    <div class="price">$${(product.price).toLocaleString()} CLP</div>
                    <div class="product-detail-description">
                        <p>${product.description}</p>
                    </div>
                    <div class="product-detail-tags">
                        <div class="product-category-tags">
                            ${product.categories && product.categories.length ? 
                                `<strong>Categorías:</strong> ${product.categories.map(
                                    category => `<span class="badge badge-category">${category}</span>`
                                ).join('')}` : ''
                            }
                        </div>
                        <div class="product-brand-tags">
                            ${product.tags && product.tags.length ? 
                                `<strong>Marcas:</strong> ${product.tags.map(
                                    tag => `<span class="badge badge-brand">${tag}</span>`
                                ).join('')}` : ''
                            }
                        </div>
                    </div>
                    ${product.sku ? `<div class="product-detail-sku"><strong>SKU:</strong> ${product.sku}</div>` : ''}
                    ${product.stock ? `<div class="product-detail-stock"><strong>Stock:</strong> ${product.stock}</div>` : ''}
                </div>
            </div>
        `;
        
        // Set the modal content
        modalContent.innerHTML = productDetailsHTML;
        
        // Show the modal
        modal.classList.add('show');
        
        // Add event listener to close button
        document.getElementById('modal-close').addEventListener('click', closeProductModal);
        
        // Add event listener to close modal when clicking outside
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeProductModal();
            }
        });
        
        // Add event listener to close modal with ESC key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeProductModal();
            }
        });
    }
    
    // Function to close the product modal
    function closeProductModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.remove('show');
    }

    // Function to display the initial message
    function displayInitialMessage() {
        productsContainer.innerHTML = `
            <div class="initial-message">
                <p>Ingresa un término de búsqueda y presiona Enter o haz clic en Buscar para cargar productos.</p>
            </div>
        `;
        errorMessage.style.display = 'none';
        loadingElement.style.display = 'none';
        clearFiltersButton.style.display = 'none';
    }

    // Function to handle fetching and initial display
    async function triggerSearchAndFetch() {
        loadingElement.style.display = 'flex';
        errorMessage.style.display = 'none';
        productsContainer.innerHTML = ''; // Clear previous results or initial message

        try {
            allProducts = await fetchProducts();

            if (!brandsCreated) {
                const uniqueTags = extractUniqueTags(allProducts);
                createBrandFilters(uniqueTags);
            }
            
            if (!categoriesCreated) {
                const uniqueCategories = extractUniqueCategories(allProducts);
                createCategoryFilters(uniqueCategories);
            }

            filterAndDisplayProducts();

        } catch (error) {
            console.error(`Error during search/fetch:`, error);
            loadingElement.style.display = 'none';
            errorMessage.style.display = 'flex';
            productsContainer.innerHTML = '';

            let reloadButton = document.getElementById('reload-button');
            if (!reloadButton) {
                reloadButton = document.createElement('button');
                reloadButton.id = 'reload-button';
                reloadButton.classList.add('btn', 'btn-primary');
                reloadButton.textContent = 'Retry Search';
                reloadButton.addEventListener('click', triggerSearchAndFetch);
                const errorText = errorMessage.querySelector('p');
                if (errorText) {
                    errorText.parentNode.insertBefore(reloadButton, errorText.nextSibling);
                } else {
                    errorMessage.appendChild(reloadButton);
                }
            }
        } finally {
            if (errorMessage.style.display === 'none') {
                loadingElement.style.display = 'none';
            }
        }
    }

    // Add event listeners for search, filter, and sort
    function setupEventListeners() {
        if (!searchButton || !searchInput || !clearFiltersButton || !sortDirectionBtn) {
            console.error('Missing UI elements:', {
                searchButton: !!searchButton,
                searchInput: !!searchInput,
                clearFiltersButton: !!clearFiltersButton,
                sortDirectionBtn: !!sortDirectionBtn
            });
            return;
        }

        searchButton.addEventListener('click', triggerSearchAndFetch);

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                triggerSearchAndFetch();
            }
        });

        clearFiltersButton.addEventListener('click', () => {
            searchInput.value = '';
            activeBrandFilters = [];
            activeCategoryFilters = [];
            
            // Uncheck all filter checkboxes
            document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });

            lastFilteredResults = null;
            lastSearchTerm = '';
            lastBrandFilterSet = [];
            lastCategoryFilterSet = [];

            // Just filter and display all products without any filters
            filterAndDisplayProducts();
        });
        
        // Sort direction button click event
        sortDirectionBtn.addEventListener('click', function() {
            isAscending = !isAscending;
            const icon = this.querySelector('i');
            
            if (isAscending) {
                icon.className = 'fas fa-sort-amount-up';
            } else {
                icon.className = 'fas fa-sort-amount-down';
            }
            
            filterAndDisplayProducts();
        });
    }

    // Initialize the page
    function initializePage() {
        const missingElements = [];
        if (!productsContainer) missingElements.push('products-container');
        if (!loadingElement) missingElements.push('loading');
        if (!errorMessage) missingElements.push('error-message');
        if (!searchInput) missingElements.push('product-search');
        if (!searchButton) missingElements.push('search-button');
        if (!tagFiltersContainer) missingElements.push('tag-filters');
        if (!categoryFiltersContainer) missingElements.push('category-filters');
        if (!clearFiltersButton) missingElements.push('clear-filters');
        if (!sortDirectionBtn) missingElements.push('sort-direction');

        if (missingElements.length > 0) {
            console.error(`Initialization failed: Missing DOM elements: ${missingElements.join(', ')}`);
            errorMessage.textContent = `Error: Missing required page elements (${missingElements.join(', ')}). Page may not function correctly.`;
            errorMessage.style.display = 'flex';
            loadingElement.style.display = 'none';
            return;
        }

        setupEventListeners();
        clearFiltersButton.style.display = 'none'; // Hide clear button initially
        triggerSearchAndFetch(); // Fetch products immediately on load
    }

    initializePage();
});
