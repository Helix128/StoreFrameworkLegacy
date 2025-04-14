document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const carouselContainer = document.querySelector('.carousel-container'); // Get container for hover events
    const carouselTrack = document.getElementById('trending-carousel');
    const carouselLoading = document.getElementById('carousel-loading');
    const carouselError = document.getElementById('carousel-error');
    const prevButton = document.getElementById('carousel-prev');
    const nextButton = document.getElementById('carousel-next');
    const indicatorsContainer = document.getElementById('carousel-indicators');
    
    // Variables
    let trendingProducts = [];
    let currentSlide = 0;
    let slideWidth = 0;
    let totalSlides = 0; // Renamed from slideCount for clarity
    let slidesPerView = calculateSlidesPerView();
    let autoScrollInterval;
    const autoScrollDelay = 5000; // Autoscroll every 5 seconds
    let isHovering = false; // Track hover state
    
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
        
        // Add click events to indicators
        indicatorsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('carousel-indicator')) {
                const slideIndex = parseInt(e.target.dataset.slide);
                goToSlide(slideIndex);
                resetAutoScroll(); // Reset timer on manual navigation
            }
        });
        
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

    // Handle window resize
    function handleResize() {
        const newSlidesPerView = calculateSlidesPerView();
        if (newSlidesPerView !== slidesPerView) {
            slidesPerView = newSlidesPerView;
            updateCarouselDimensions();
            createIndicators(); // Recreate indicators if slides per view changes
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
        carouselTrack.style.transform = `translateX(${offset}px)`;
        
        // Update indicators
        updateIndicators();
        
        // Update button states (consider disabling if not looping)
        const disableNav = totalSlides <= slidesPerView;
        prevButton.disabled = disableNav;
        nextButton.disabled = disableNav;
    }
    
    // Create carousel indicators
    function createIndicators() {
        indicatorsContainer.innerHTML = '';
        // Calculate indicators needed based on pages, not individual slides
        const indicatorsNeeded = Math.max(1, totalSlides - slidesPerView + 1); // Number of possible start positions
        
        // Don't show indicators if only one page
        if (indicatorsNeeded <= 1) {
            indicatorsContainer.style.display = 'none';
            return;
        }
        
        indicatorsContainer.style.display = 'flex'; // Ensure visible if needed
        for (let i = 0; i < indicatorsNeeded; i++) {
            const indicator = document.createElement('button');
            indicator.classList.add('carousel-indicator');
            indicator.setAttribute('aria-label', `Go to slide group ${i + 1}`); // Accessibility
            indicator.dataset.slide = i; // Index corresponds to the first slide in the group
            indicatorsContainer.appendChild(indicator);
        }
        
        updateIndicators(); // Set the initial active indicator
    }
    
    // Update indicators active state
    function updateIndicators() {
        const indicators = indicatorsContainer.querySelectorAll('.carousel-indicator');
        indicators.forEach((indicator) => {
            // Indicator index matches the currentSlide index
            if (parseInt(indicator.dataset.slide) === currentSlide) {
                indicator.classList.add('active');
                indicator.setAttribute('aria-current', 'true');
            } else {
                indicator.classList.remove('active');
                indicator.removeAttribute('aria-current');
            }
        });
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
                indicatorsContainer.style.display = 'none';
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
            initCarousel(); // This now calls updateCarouselDimensions, createIndicators, goToSlide(0), and starts autoscroll
            
            // Show "body.loaded" to hide global loading overlay
            document.body.classList.add('loaded');
            
        } catch (error) {
            console.error('Failed to load trending products:', error);
            carouselError.style.display = 'flex';
            prevButton.style.display = 'none'; // Hide nav on error
            nextButton.style.display = 'none';
            indicatorsContainer.style.display = 'none';
        } finally {
            carouselLoading.style.display = 'none';
        }
    }
    
    // Initialize page
    loadTrendingProducts();
});
