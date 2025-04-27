/**
 * Adds Instagram contact button to product modals
 */
document.addEventListener('DOMContentLoaded', function() {
    // Function to add the contact button to product modal and hide price
    function addContactButtonToProductModal() {
        // This function will be called each time a product modal is opened
        const modalContent = document.getElementById('modal-product-content');
        if (!modalContent) return;
        
        // Select the product details container
        const detailsInfo = modalContent.querySelector('.product-detail-info');
        if (!detailsInfo) return;
        
        // Hide the price element
        const priceElement = detailsInfo.querySelector('.price');
        if (priceElement) {
            priceElement.style.display = 'none';
        }
        
        // Check if the button already exists
        if (!detailsInfo.querySelector('.contact-button')) {
            // Create a contact button
            const contactButton = document.createElement('a');
            contactButton.href = 'https://instagram.com/starhouse.cl';
            contactButton.className = 'contact-button';
            contactButton.target = '_blank';
            contactButton.innerHTML = '<br><div class="btn btn-outline"><i class="fab fa-instagram"></i>&nbsp;Comprar</div>';
            
            // Append the button to the details info section
            detailsInfo.appendChild(contactButton);
        }
    }

    // Monitor for modal open events by watching for class changes
    const modalObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.classList && mutation.target.classList.contains('show')) {
                // When modal is shown, add the contact button
                addContactButtonToProductModal();
            }
        });
    });

    // Start observing product modals
    const productModals = document.querySelectorAll('.modal-overlay');
    productModals.forEach(modal => {
        modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    // Also check if any modals are already open when the page loads
    productModals.forEach(modal => {
        if (modal.classList.contains('show')) {
            addContactButtonToProductModal();
        }
    });
});
