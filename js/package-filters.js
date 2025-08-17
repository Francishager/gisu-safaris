// Package filtering and display functionality (deduplicated)
document.addEventListener('DOMContentLoaded', function() {
    const allPackagesContainer = document.getElementById('allPackagesContainer');
    if (allPackagesContainer) {
        // Hide by default; only show on explicit click
        allPackagesContainer.style.display = 'none';
    }

    // Initialize filters but do NOT auto-load/render
    initPackageFilters(false);

    // Toggle button handler
    const viewAllBtn = document.getElementById('viewAllPackagesBtn');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Prefer loader if available
            if (window.safariPackagesLoader) {
                safariPackagesLoader.togglePackages();
            } else {
                handleToggleAllPackages();
            }
        });
    }
});

// Local fallback toggle (avoids clashing with loader's global)
function handleToggleAllPackages() {
    const container = document.getElementById('allPackagesContainer');
    const button = document.getElementById('viewAllPackagesBtn');
    if (!container || !button) return;

    const shouldShow = container.style.display === 'none' || !container.style.display;
    container.style.display = shouldShow ? 'block' : 'none';
    button.innerHTML = shouldShow
        ? '<i class="fas fa-times me-2"></i>Hide All Packages'
        : '<i class="fas fa-briefcase me-2"></i>View All Safari Packages';

    if (shouldShow) {
        // Ensure filters set and scroll into view
        initPackageFilters(false);
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initPackageFilters(setDefaultAll) {
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const filter = this.getAttribute('data-filter');
            // Update active UI state here
            applyFilterUI(filter, this);
            // Delegate filtering
            if (window.safariPackagesLoader) {
                safariPackagesLoader.currentFilter = filter;
                // Only render if container is visible; otherwise, wait until opened
                const container = document.getElementById('allPackagesContainer');
                if (container && container.style.display !== 'none') {
                    if (!safariPackagesLoader.isLoaded) {
                        safariPackagesLoader.loadPackages();
                    } else {
                        safariPackagesLoader.renderPackages();
                    }
                }
            } else {
                // Fallback DOM-based filter
                domFilterPackages(filter);
            }
        });
    });

    // Default to 'all' on first init
    if (setDefaultAll) {
        const allBtn = document.querySelector('[data-filter="all"]');
        // Set active and render default view
        applyFilterUI('all', allBtn);
        // Do not auto-render; wait for user to open the section
    }
}

// Manage active button state only
function applyFilterUI(filter, clickedButton) {
    // Update active state of buttons
    const buttons = document.querySelectorAll('[data-filter]');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (clickedButton) {
        clickedButton.classList.add('active');
    } else {
        const buttonToActivate = document.querySelector(`[data-filter="${filter}"]`);
        if (buttonToActivate) buttonToActivate.classList.add('active');
    }
}

// Fallback DOM-based filtering when loader not present
function domFilterPackages(filter) {
    const packages = document.querySelectorAll('.package-card');
    let visibleCount = 0;
    packages.forEach(pkg => {
        const match = filter === 'all' || pkg.getAttribute('data-country') === filter;
        pkg.style.display = match ? 'block' : 'none';
        if (match) visibleCount++;
    });

    // Hide loading indicator once filtering is possible
    const loadingIndicator = document.getElementById('packagesLoading');
    if (loadingIndicator) loadingIndicator.style.display = 'none';

    // Do NOT force grid layout to avoid horizontal scroll; let Bootstrap control layout
    // const packagesGrid = document.getElementById('allPackagesGrid');
    // if (packagesGrid) packagesGrid.style.display = '';

    // No-results handling
    const noResults = document.getElementById('noResultsMessage');
    if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';

    // Smooth scroll on mobile
    if (window.innerWidth < 992) {
        const container = document.getElementById('allPackagesContainer');
        if (container) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
