document.addEventListener('DOMContentLoaded', () => {
    const productsContainer = document.getElementById('products-container');
    const loadingElement = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const searchInput = document.getElementById('product-search');
    const searchButton = document.getElementById('search-button');
    const tagFiltersContainer = document.getElementById('tag-filters');
    const clearFiltersButton = document.getElementById('clear-filters');

    let allProducts = [];
    let activeFilters = [];
    let lastFilteredResults = null; // Keep memoization for filtering after fetch
    let lastSearchTerm = '';
    let lastFilterSet = [];
    let tagsCreated = false; // Flag to ensure tags are created only once
    let currentSortOption = 'trending'; // Opción de ordenamiento predeterminada
    let isAscending = true; // Dirección de ordenamiento predeterminada

    // Function to fetch products from JSON file (no caching)
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
            `+tagBadge(product,"trending")+
                `<div class="card-img-container">
                    <img src="${imageSrc}" alt="${product.name}" class="card-img" onerror="this.src='placeholder.jpg'">
                </div>
                <div class="card-body">
                    <h3 class="card-title">${product.name}</h3>
                    <div class="product-tags">
                        ${product.tags.map(tag => `<span class="badge">${tag}</span>`).join('')}
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

    // Function to extract all unique tags
    function extractUniqueTags(products) {
        const allTags = new Set();
        products.forEach(product => {
            product.tags.forEach(tag => allTags.add(tag));
        });
        return Array.from(allTags).sort();
    }

    // Function to create tag filters (only once)
    function createTagFilters(tags) {
        if (tagsCreated) return; // Don't recreate if already done

        tagFiltersContainer.innerHTML = ''; // Clear any previous placeholders
        tags.forEach(tag => {
            if(tag=="trending") return;
            const tagButton = document.createElement('button');
            tagButton.classList.add('span', 'tag-filter');
            tagButton.textContent = tag;
            tagButton.dataset.tag = tag;

            // Add click event listener to toggle filter
            tagButton.addEventListener('click', () => {
                tagButton.classList.toggle('active');

                if (tagButton.classList.contains('active')) {
                    activeFilters.push(tag);
                } else {
                    activeFilters = activeFilters.filter(t => t !== tag);
                }

                // Apply filters immediately after tag change
                filterAndDisplayProducts();
            });

            tagFiltersContainer.appendChild(tagButton);
        });
        tagsCreated = true; // Mark tags as created
        // Show the clear filters button only after tags are created
        if (tags.length > 0) {
            clearFiltersButton.style.display = 'inline-block';
        }
    }

    function toggleTag(tag){
        const tagButton = document.querySelector(`.tag-filter[data-tag="${tag}"]`);
        if (tagButton) {
            tagButton.classList.toggle('active');
            if (tagButton.classList.contains('active')) {
                activeFilters.push(tag);
            } else {
                activeFilters = activeFilters.filter(t => t !== tag);
            }
        }
    }

    // Function to filter products with memoization
    function filterProducts(products, searchTerm, tagFilters) {
        if (lastFilteredResults && 
            searchTerm === lastSearchTerm && 
            JSON.stringify(tagFilters) === JSON.stringify(lastFilterSet)) {
            return lastFilteredResults;
        }
        
        const filtered = products.filter(product => {
            const searchMatch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const tagMatch = tagFilters.length === 0 || 
                tagFilters.every(tag => product.tags.includes(tag));
            
            return searchMatch && tagMatch;
        });
        
        lastFilteredResults = filtered;
        lastSearchTerm = searchTerm;
        lastFilterSet = [...tagFilters];
        
        return filtered;
    }

    // Nueva función para ordenar productos
    function sortProducts(products) {
        // Crear una copia para no modificar el array original
        const sortedProducts = [...products];
        
        switch (currentSortOption) {
            case 'trending':
                // Ordenar primero por trending (los productos trending primero)
                // y luego alfabéticamente por nombre
                sortedProducts.sort((a, b) => {
                    const aTrending = a.tags.includes('trending') ? 1 : 0;
                    const bTrending = b.tags.includes('trending') ? 1 : 0;
                    
                    // Si los estados trending son diferentes, ordenar por ellos
                    if (bTrending !== aTrending) {
                        return bTrending - aTrending;
                    }
                    
                    // Si ambos son trending o ambos no son trending, ordenar alfabéticamente
                    return isAscending ? 
                        a.name.localeCompare(b.name) : 
                        b.name.localeCompare(a.name);
                });
                break;
                
            case 'alphabetical':
                // Ordenar alfabéticamente por nombre
                sortedProducts.sort((a, b) => {
                    return isAscending ? 
                        a.name.localeCompare(b.name) : 
                        b.name.localeCompare(a.name);
                });
                break;
                
            case 'price':
                // Ordenar por precio
                sortedProducts.sort((a, b) => {
                    return !isAscending ? 
                        a.price - b.price : 
                        b.price - a.price;
                });
                break;
        }
        
        return sortedProducts;
    }

    // Modificar la función filterAndDisplayProducts para incluir el ordenamiento
    function filterAndDisplayProducts() {
        if (!allProducts || allProducts.length === 0) {
            displayInitialMessage();
            return;
        }

        const searchTerm = searchInput.value.trim();
        const filteredProducts = filterProducts(allProducts, searchTerm, activeFilters);
        
        // Ordenar los productos filtrados
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
                        <div class="product-tags">
                            ${product.tags.map(tag => `<span class="badge">${tag}</span>`).join('')}
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
        // This function might still be useful for the 'Clear Filters' action
        productsContainer.innerHTML = `
            <div class="initial-message">
                <p>Ingresa un término de búsqueda y presiona Enter o haz clic en Buscar para cargar productos.</p>
            </div>
        `;
        errorMessage.style.display = 'none';
        loadingElement.style.display = 'none';
        // Hide clear filters button when resetting to initial state
        clearFiltersButton.style.display = 'none';
        // Reset tagsCreated flag if we want tags to reappear on subsequent searches after clearing
        // tagsCreated = false; // Optional: uncomment if tags should be regenerated after clearing
        // tagFiltersContainer.innerHTML = ''; // Optional: uncomment to clear tag buttons visually
    }

    // New function to handle fetching and initial display
    async function triggerSearchAndFetch() {
        loadingElement.style.display = 'flex';
        errorMessage.style.display = 'none';
        productsContainer.innerHTML = ''; // Clear previous results or initial message

        try {
            allProducts = await fetchProducts();

            if (!tagsCreated) {
                const uniqueTags = extractUniqueTags(allProducts);
                createTagFilters(uniqueTags);
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

    // Add event listeners for search and filter
    function setupEventListeners() {
        if (!searchButton || !searchInput || !clearFiltersButton) {
            console.error('Missing UI elements:', {
                searchButton: !!searchButton,
                searchInput: !!searchInput,
                clearFiltersButton: !!clearFiltersButton
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
            activeFilters = [];
            document.querySelectorAll('.tag-filter.active').forEach(button => {
                button.classList.remove('active');
            });

            lastFilteredResults = null;
            lastSearchTerm = '';
            lastFilterSet = [];

            // Instead of hiding everything with displayInitialMessage(),
            // just filter and display all products without any filters
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
        if (!clearFiltersButton) missingElements.push('clear-filters');

        if (missingElements.length > 0) {
            console.error(`Initialization failed: Missing DOM elements: ${missingElements.join(', ')}`);
            errorMessage.textContent = `Error: Missing required page elements (${missingElements.join(', ')}). Page may not function correctly.`;
            errorMessage.style.display = 'flex';
            loadingElement.style.display = 'none';
            return;
        }

        setupEventListeners();
        clearFiltersButton.style.display = 'none'; // Keep hiding clear button initially
        triggerSearchAndFetch(); // Fetch products immediately on load
    }

    initializePage();
});
