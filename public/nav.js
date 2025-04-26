// Remove initial hiding logic, CSS handles this now.
document.addEventListener('DOMContentLoaded', function() {
    // Load the navigation
    fetch('nav.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            document.body.insertAdjacentHTML('afterbegin', data);
            // Add .loaded class to body to hide overlay and show content
            document.body.classList.add('loaded');
            
            // Highlight current page in navigation
            highlightCurrentPage();
            
            // Initialize mobile menu toggle functionality
            initMobileNav();
        })
        .catch(error => {
            console.error('Failed to load navigation:', error);
            // Still add .loaded class to show the page even if nav fails
            document.body.classList.add('loaded');
        });
});

/**
 * Highlights the current page in the navigation bar by adding 'active' class
 */
function highlightCurrentPage() {
    // Get current path from window location
    const currentPath = window.location.pathname;
    
    // Find all navigation links
    const navLinks = document.querySelectorAll('.navbar-link');
    
    // Loop through links and check if they match current path
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        
        // Check if the link path matches the current path
        // Also handle the root path special case
        if ((linkPath === currentPath) || 
            (currentPath === '/' && linkPath === '/index') ||
            (currentPath === '/index.html' && linkPath === '/index')) {
            
            // Add active class to the li parent element
            link.parentElement.classList.add('active');
        }
    });
}

/**
 * Initializes mobile navigation toggle functionality
 */
function initMobileNav() {
    const navbarToggle = document.getElementById('navbarToggle');
    const navbarMenu = document.getElementById('navbarMenu');
    
    if (navbarToggle && navbarMenu) {
        navbarToggle.addEventListener('click', function() {
            navbarMenu.classList.toggle('show');
            // Optional: Toggle aria-expanded attribute for accessibility
            const expanded = navbarMenu.classList.contains('show');
            navbarToggle.setAttribute('aria-expanded', expanded);
        });
        
        // Close menu when clicking on a link (for better UX on mobile)
        const navLinks = navbarMenu.querySelectorAll('.navbar-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                // Only close if we're in mobile view
                if (window.innerWidth <= 575) {
                    navbarMenu.classList.remove('show');
                    navbarToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }
}