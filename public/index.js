document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const carouselContainer = document.querySelector('.carousel-container'); // Get container for hover events
    const carouselTrack = document.getElementById('trending-carousel');
    const carouselLoading = document.getElementById('carousel-loading');
    const carouselError = document.getElementById('carousel-error');
    const prevButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');
    
    // Variables
    let trendingProducts = [];
    let currentSlide = 0;
    let slideWidth = 0;
    let totalSlides = 0; // Renamed from slideCount for clarity
    let slidesPerView = calculateSlidesPerView();
    let autoScrollInterval;
    const autoScrollDelay = 5000; // Autoscroll every 5 seconds
    let isHovering = false; // Track hover state
    
    // Drag/touch functionality variables
    let isDragging = false;
    let startPos = 0;
    let currentTranslate = 0;
    let prevTranslate = 0;
    let animationID = 0;
    let dragThreshold = 50; // Minimum drag distance to trigger slide change
    
    // Configure how many slides to show at different screen sizes
    function calculateSlidesPerView() {
        const width = window.innerWidth;
        if (width < 576) return 1; // xs
        if (width < 992) return 2; // sm, md
        return 3; // lg, xl+
    }
    
    // Fetch trending products
    async function fetchTrendingProducts() {
        try {
            const response = await fetch('products.json', {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const products = await response.json();
            
            // Filter products with "trending" tag
            return products.filter(product => 
                product.tags && product.tags.includes('trending')
            );
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }
    
    // Create product card for carousel
    function createCarouselProductCard(product) {
        const imageSrc = product.image ? product.image : 'Placeholder.jpg';
        
        return `
            <div class="carousel-slide" data-product-id="${product.id}">
                <div class="card product-card">
                    <div class="card-img-container">
                        <img src="${imageSrc}" alt="${product.name}" class="card-img" onerror="this.src='placeholder.jpg'">
                        <div class="product-badge badge badge-new">Trending</div>
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${product.name}</h3>
                        <div class="price">$${(product.price).toLocaleString()} CLP</div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-outline btn-sm details-button" data-product-id="${product.id}">Detalles</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Initialize carousel
    function initCarousel() {
        // Set carousel width and handle resize
        updateCarouselDimensions();
        window.addEventListener('resize', handleResize);
        
        // Add click events to navigation buttons
        prevButton.addEventListener('click', () => {
            goToSlide(currentSlide - 1);
            resetAutoScroll(); // Reset timer on manual navigation
        });
        
        nextButton.addEventListener('click', () => {
            goToSlide(currentSlide + 1);
            resetAutoScroll(); // Reset timer on manual navigation
        });
        
        // Add drag event handlers for the carousel
        setupDragEvents();
        
        // Add click event to all product cards for details
        carouselTrack.addEventListener('click', (e) => {
            const detailsButton = e.target.closest('.details-button');
            if (detailsButton) {
                const productId = detailsButton.dataset.productId;
                const product = trendingProducts.find(p => p.id === parseInt(productId));
                if (product) {
                    showProductDetails(product);
                }
            }
        });

        // Pause autoscroll on hover
        carouselContainer.addEventListener('mouseenter', () => {
            isHovering = true;
            stopAutoScroll();
        });
        carouselContainer.addEventListener('mouseleave', () => {
            isHovering = false;
            startAutoScroll();
        });

        // Start autoscroll
        startAutoScroll();
    }

    // Setup mouse/touch drag events
    function setupDragEvents() {
        // Mouse Events
        carouselTrack.addEventListener('mousedown', dragStart);
        carouselTrack.addEventListener('mousemove', drag);
        carouselTrack.addEventListener('mouseup', dragEnd);
        carouselTrack.addEventListener('mouseleave', dragEnd);
        
        // Touch Events
        carouselTrack.addEventListener('touchstart', dragStart);
        carouselTrack.addEventListener('touchmove', drag);
        carouselTrack.addEventListener('touchend', dragEnd);
        
        // Prevent context menu when dragging
        carouselTrack.addEventListener('contextmenu', e => {
            if (isDragging) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        });
    }
    
    // Start drag
    function dragStart(event) {
        // Get the starting position of the cursor/finger
        startPos = getPositionX(event);
        isDragging = true;
        isHovering = true; // Consider dragging as hovering to stop autoscroll
        stopAutoScroll();
        
        // Store current position
        currentTranslate = -slideWidth * currentSlide;
        prevTranslate = currentTranslate;
        
        // Cancel any click events if we're starting to drag
        if (event.type === 'touchstart') {
            event.target.addEventListener('click', preventClick, { once: true });
        }
        
        // Stop default behavior (e.g., text selection)
        event.preventDefault();
    }
    
    // During drag
    function drag(event) {
        if (!isDragging) return;
        
        const currentPosition = getPositionX(event);
        const diff = currentPosition - startPos;
        
        // Calculate the new position
        currentTranslate = prevTranslate + diff;
        
        // Apply transform to move the carousel
        carouselTrack.style.transform = `translateX(${currentTranslate}px)`;
        
        // Prevent default behavior like scrolling the page
        event.preventDefault();
    }
    
    // End drag
    function dragEnd(event) {
        if (!isDragging) return;
        isDragging = false;
        isHovering = false;
        
        const movedBy = currentTranslate - prevTranslate;
        
        // Determine if we should change slides based on drag distance
        if (Math.abs(movedBy) > dragThreshold) {
            if (movedBy > 0) {
                // Dragged right -> go to previous slide
                goToSlide(currentSlide - 1);
            } else {
                // Dragged left -> go to next slide
                goToSlide(currentSlide + 1);
            }
        } else {
            // Not dragged enough, snap back to current slide
            goToSlide(currentSlide);
        }
        
        startAutoScroll(); // Restart autoscroll after dragging ends
    }
    
    // Get the x position of mouse or touch event
    function getPositionX(event) {
        return event.type.includes('mouse') 
            ? event.pageX 
            : event.touches[0].clientX;
    }
    
    // Prevent click after drag
    function preventClick(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Handle window resize
    function handleResize() {
        const newSlidesPerView = calculateSlidesPerView();
        if (newSlidesPerView !== slidesPerView) {
            slidesPerView = newSlidesPerView;
            updateCarouselDimensions();
            // Adjust currentSlide if it's now out of bounds
            const maxIndex = Math.max(0, totalSlides - slidesPerView);
            if (currentSlide > maxIndex) {
                currentSlide = maxIndex;
            }
            goToSlide(currentSlide); // Reposition and update UI
            resetAutoScroll(); // Reset timer after resize adjustments
        } else {
            // If only width changed but not slidesPerView, just update dimensions
            updateCarouselDimensions();
            goToSlide(currentSlide); // Ensure correct positioning
        }
    }
    
    // Update carousel dimensions based on screen size
    function updateCarouselDimensions() {
        const carouselWrapper = carouselTrack.closest('.carousel-wrapper');
        if (!carouselWrapper) return; // Guard against errors if structure changes
        
        slideWidth = carouselWrapper.offsetWidth / slidesPerView;
        
        // Update slide widths
        const slides = carouselTrack.querySelectorAll('.carousel-slide');
        slides.forEach(slide => {
            slide.style.minWidth = `${slideWidth}px`;
            slide.style.maxWidth = `${slideWidth}px`; // Ensure slides don't exceed width
        });
        
        // Update track width (only needed if not using flex auto width)
        totalSlides = slides.length;
    }
    
    // Go to specific slide
    function goToSlide(index) {
        const maxIndex = Math.max(0, totalSlides - slidesPerView); // Ensure maxIndex is not negative
        
        // Handle looping for autoscroll or manual clicks
        if (index < 0) {
            index = maxIndex; // Loop to the end from the beginning
        } else if (index > maxIndex) {
            index = 0; // Loop to the beginning from the end
        }
        
        currentSlide = index;
        const offset = -slideWidth * currentSlide;
        
        // Use CSS transition for smooth animation
        carouselTrack.style.transition = 'transform 0.3s ease-out';
        carouselTrack.style.transform = `translateX(${offset}px)`;
        
        // Store the offset value for drag calculations
        currentTranslate = offset;
        prevTranslate = offset;
        
        // Update button states (consider disabling if not looping)
        const disableNav = totalSlides <= slidesPerView;
        prevButton.disabled = disableNav;
        nextButton.disabled = disableNav;
        
        // Remove transition after animation completes
        setTimeout(() => {
            carouselTrack.style.transition = '';
        }, 300);
    }
    
    // --- Autoscroll Functions ---
    function startAutoScroll() {
        stopAutoScroll(); // Clear any existing interval
        if (!isHovering && totalSlides > slidesPerView) { // Only scroll if needed and not hovering
            autoScrollInterval = setInterval(() => {
                goToSlide(currentSlide + 1);
            }, autoScrollDelay);
        }
    }

    function stopAutoScroll() {
        clearInterval(autoScrollInterval);
    }

    function resetAutoScroll() {
        stopAutoScroll();
        startAutoScroll();
    }
    
    // Show product details modal
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
                <div class="product-detail-image">
                    <img src="${imageSrc}" alt="${product.name}" onerror="this.src='placeholder.jpg'">
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
    
    // Close product modal
    function closeProductModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.remove('show');
    }
    
    // Load trending products
    async function loadTrendingProducts() {
        try {
            carouselLoading.style.display = 'flex';
            carouselError.style.display = 'none';
            carouselTrack.innerHTML = ''; // Clear previous content
            
            trendingProducts = await fetchTrendingProducts();
            
            if (trendingProducts.length === 0) {
                carouselTrack.innerHTML = `
                    <div class="carousel-empty">
                        <p>No trending products found.</p>
                    </div>
                `;
                carouselLoading.style.display = 'none';
                prevButton.style.display = 'none'; // Hide nav if no products
                nextButton.style.display = 'none';
                return;
            }
            
            // Show nav buttons
            prevButton.style.display = 'flex';
            nextButton.style.display = 'flex';

            // Generate carousel slides
            let carouselHTML = '';
            trendingProducts.forEach(product => {
                carouselHTML += createCarouselProductCard(product);
            });
            
            // Replace loading spinner with products
            carouselTrack.innerHTML = carouselHTML;
            
            // Initialize carousel after content is loaded
            slidesPerView = calculateSlidesPerView(); // Recalculate on load
            initCarousel(); // This now calls updateCarouselDimensions, goToSlide(0), and starts autoscroll
            
            // Show "body.loaded" to hide global loading overlay
            document.body.classList.add('loaded');
            
        } catch (error) {
            console.error('Failed to load trending products:', error);
            carouselError.style.display = 'flex';
            prevButton.style.display = 'none'; // Hide nav on error
            nextButton.style.display = 'none';
        } finally {
            carouselLoading.style.display = 'none';
        }
    }
    
    // Initialize page
    loadTrendingProducts();
});
