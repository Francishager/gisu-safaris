// Dynamic Safari Packages Loader
// Loads all safari packages without page navigation

class SafariPackagesLoader {
    constructor() {
        this.packages = [];
        this.currentFilter = 'all';
        this.isLoaded = false;
        this.isVisible = false;
        this.initializePackages();
    }

    // Initialize package data based on actual files in packages directory
    initializePackages() {
        this.packages = [
            // Uganda Packages
            {
                id: 'uganda-gorilla-trekking',
                name: 'Uganda Gorilla Trekking Safari',
                country: 'uganda',
                duration: '3 Days',
                price: 'From $650',
                image: './images/top-safari-packages/3-Day-Luxury-Gorilla-Trekking-Safari-in-Uganda-Bwindi-Gorilla-Tour.jpg',
                description: 'Experience face-to-face encounters with mountain gorillas in Bwindi Impenetrable Forest.',
                highlights: ['Mountain Gorillas', 'Bwindi Forest', 'Expert Guides'],
                rating: 4.9,
                reviews: 127,
                url: './packages/uganda-gorilla-trekking.html'
            },
            {
                id: 'uganda-big-five',
                name: 'Uganda Big Five Safari',
                country: 'uganda',
                duration: '5 Days',
                price: 'From $720',
                image: './images/uganda/Queen-Elizabeth-National.jpg',
                description: 'Track the Big Five across Uganda’s top savannah parks.',
                highlights: ['Big Five', 'Game Drives', 'Boat Safari'],
                rating: 4.7,
                reviews: 88,
                url: './packages/uganda-big-five.html'
            },
            {
                id: 'uganda-budget-safari',
                name: 'Uganda Budget Safari',
                country: 'uganda',
                duration: '4 Days',
                price: 'From $480',
                image: './images/top-safari-packages/about_gisu_safaris2.jpg',
                description: 'Affordable wildlife encounters without compromising experience.',
                highlights: ['Budget Lodges', 'Wildlife', 'Local Guides'],
                rating: 4.5,
                reviews: 64,
                url: './packages/uganda-budget-safari.html'
            },
            {
                id: 'uganda-cultural-safari',
                name: 'Uganda Cultural Safari',
                country: 'uganda',
                duration: '3 Days',
                price: 'From $390',
                image: './images/top-safari-packages/about_gisu_safaris2.jpg',
                description: 'Immerse yourself in Uganda’s rich cultural heritage.',
                highlights: ['Cultural Villages', 'Dance & Music', 'Local Cuisine'],
                rating: 4.6,
                reviews: 52,
                url: './packages/uganda-cultural-safari.html'
            },
            {
                id: 'uganda-kibale-national-park',
                name: 'Kibale National Park Adventure',
                country: 'uganda',
                duration: '3 Days',
                price: 'From $520',
                image: './images/top-safari-packages/kibale.jpg',
                description: 'Explore the primate capital and lush crater lakes region.',
                highlights: ['Chimpanzees', 'Crater Lakes', 'Nature Walks'],
                rating: 4.7,
                reviews: 71,
                url: './packages/uganda-kibale-national-park.html'
            },
            {
                id: 'uganda-luxury-tour',
                name: 'Uganda Luxury Tour',
                country: 'uganda',
                duration: '6 Days',
                price: 'From $1,450',
                image: './images/top-safari-packages/3-Day-Luxury-Gorilla-Trekking-Safari-in-Uganda-Bwindi-Gorilla-Tour.jpg',
                description: 'Premium lodges, private drives, and curated experiences.',
                highlights: ['Luxury Lodges', 'Private Guide', 'Fine Dining'],
                rating: 4.9,
                reviews: 81,
                url: './packages/uganda-luxury-tour.html'
            },
            {
                id: 'uganda-rwenzori-hike',
                name: 'Rwenzori Mountains Hike',
                country: 'uganda',
                duration: '6 Days',
                price: 'From $860',
                image: './images/top-safari-packages/about_gisu_safaris2.jpg',
                description: 'Trek the mystical Mountains of the Moon.',
                highlights: ['Rwenzori Peaks', 'Glacial Valleys', 'Guided Trek'],
                rating: 4.6,
                reviews: 55,
                url: './packages/uganda-rwenzori-hike.html'
            },
            {
                id: 'uganda-sasa-trail-mount-elgon',
                name: 'Mount Elgon Sasa Trail',
                country: 'uganda',
                duration: '4 Days',
                price: 'From $540',
                image: './images/uganda/Sipi-waterfall-jpg.webp',
                description: 'Scenic trek to the Wagagai summit via the Sasa Trail.',
                highlights: ['Sipi Falls', 'Wagagai', 'Caves & Forests'],
                rating: 4.7,
                reviews: 49,
                url: './packages/uganda-sasa-trail-mount-elgon.html'
            },
            {
                id: 'uganda-murchison-falls',
                name: 'Murchison Falls Safari',
                country: 'uganda',
                duration: '4 Days',
                price: 'From $580',
                image: './images/uganda/Queen-Elizabeth-National.jpg',
                description: 'Witness the world\'s most powerful waterfall and incredible wildlife in Uganda\'s largest national park.',
                highlights: ['Murchison Falls', 'Big Four Wildlife', 'Nile River Safari'],
                rating: 4.8,
                reviews: 94,
                url: './packages/uganda-murchison-falls.html'
            },
            {
                id: 'uganda-queen-elizabeth',
                name: 'Queen Elizabeth National Park',
                country: 'uganda',
                duration: '3 Days',
                price: 'From $520',
                image: './images/uganda/Queen-Elizabeth-National.jpg',
                description: 'Explore Uganda\'s most popular national park with tree-climbing lions and diverse wildlife.',
                highlights: ['Tree-climbing Lions', 'Kazinga Channel', 'Crater Lakes'],
                rating: 4.7,
                reviews: 86,
                url: './packages/uganda-queen-elizabeth.html'
            },
            {
                id: 'uganda-chimpanzee-tracking',
                name: 'Kibale Chimpanzee Tracking',
                country: 'uganda',
                duration: '2 Days',
                price: 'From $450',
                image: './images/top-safari-packages/kibale.jpg',
                description: 'Track our closest relatives in the primate capital of the world.',
                highlights: ['Chimpanzee Tracking', 'Kibale Forest', '13 Primate Species'],
                rating: 4.8,
                reviews: 73,
                url: './packages/uganda-chimpanzee-tracking.html'
            },
            {
                id: 'uganda-complete-safari',
                name: 'Uganda Complete Safari',
                country: 'uganda',
                duration: '7 Days',
                price: 'From $1,200',
                image: './images/top-safari-packages/about_gisu_safaris2.jpg',
                description: 'Comprehensive Uganda safari covering gorillas, chimps, and big game.',
                highlights: ['Gorillas & Chimps', 'Big Game', 'Cultural Experiences'],
                rating: 4.9,
                reviews: 156,
                url: './packages/uganda-complete-safari.html'
            },

            // Kenya Packages
            {
                id: 'kenya-masai-mara-big-five',
                name: 'Kenya Masai Mara Big Five',
                country: 'kenya',
                duration: '5 Days',
                price: 'From $750',
                image: './images/top-safari-packages/masai-mara-safari-1.jpg',
                description: 'Experience the Big Five and Great Migration in Kenya\'s premier wildlife reserve.',
                highlights: ['Big Five', 'Great Migration', 'Masai Culture'],
                rating: 4.9,
                reviews: 203,
                url: './packages/kenya-masai-mara-big-five.html'
            },
            {
                id: 'kenya-samburu-reserve',
                name: 'Samburu National Reserve',
                country: 'kenya',
                duration: '4 Days',
                price: 'From $680',
                image: './images/samburu_safari.jpg',
                description: 'Discover unique wildlife species in Kenya\'s rugged northern frontier.',
                highlights: ['Special Five', 'Ewaso River', 'Samburu Culture'],
                rating: 4.7,
                reviews: 89,
                url: './packages/kenya-samburu-national-reserve.html'
            },
            {
                id: 'kenya-mount-kenya-hiking',
                name: 'Mount Kenya Hiking Adventure',
                country: 'kenya',
                duration: '6 Days',
                price: 'From $850',
                image: './images/uganda/Sipi-waterfall-jpg.webp',
                description: 'Conquer Africa\'s second-highest peak with breathtaking alpine scenery.',
                highlights: ['Mount Kenya Summit', 'Alpine Lakes', 'Unique Flora'],
                rating: 4.6,
                reviews: 67,
                url: './packages/kenya-mount-kenya-hiking.html'
            },
            {
                id: 'kenya-beach-safari-combo',
                name: 'Kenya Beach & Safari Combo',
                country: 'kenya',
                duration: '8 Days',
                price: 'From $1,150',
                image: './images/top-safari-packages/masai-mara-2.webp',
                description: 'Perfect combination of wildlife safari and pristine beach relaxation.',
                highlights: ['Masai Mara', 'Diani Beach', 'Cultural Tours'],
                rating: 4.8,
                reviews: 142,
                url: './packages/kenya-beach-safari-combo.html'
            },

            {
                id: 'kenya-mombasa-neptune-paradise',
                name: 'Mombasa Neptune Paradise Beach',
                country: 'kenya',
                duration: '5 Days',
                price: 'From $820',
                image: './images/top-safari-packages/masai-mara-2.webp',
                description: 'Relax on pristine beaches after thrilling safari days.',
                highlights: ['Beach Resort', 'Indian Ocean', 'Relaxation'],
                rating: 4.6,
                reviews: 74,
                url: './packages/kenya-mombasa-neptune-paradise.html'
            },

            // Tanzania Packages
            {
                id: 'tanzania-serengeti-migration',
                name: 'Serengeti Great Migration',
                country: 'tanzania',
                duration: '6 Days',
                price: 'From $950',
                image: './images/top-safari-packages/serengeti-safari-1.jpg',
                description: 'Witness the world\'s greatest wildlife spectacle in the Serengeti.',
                highlights: ['Great Migration', 'Serengeti Plains', 'Ngorongoro Crater'],
                rating: 4.9,
                reviews: 187,
                url: './packages/serengeti-national-park.html'
            },
            {
                id: 'tanzania-luxury-tented',
                name: 'Tanzania Luxury Tented Safari',
                country: 'tanzania',
                duration: '7 Days',
                price: 'From $1,450',
                image: './images/top-safari-packages/Serengeti-safaris-2.webp',
                description: 'Ultimate luxury safari experience in premium tented camps.',
                highlights: ['Luxury Camps', 'Private Game Drives', 'Gourmet Dining'],
                rating: 4.9,
                reviews: 98,
                url: './packages/tanzania-luxury-tented-camp.html'
            },
            {
                id: 'tanzania-classic-tour',
                name: 'Tanzania Classic Safari',
                country: 'tanzania',
                duration: '5 Days',
                price: 'From $780',
                image: './images/top-safari-packages/serengeti-safari-3.jpg',
                description: 'Classic Tanzania safari covering the northern circuit highlights.',
                highlights: ['Serengeti', 'Ngorongoro', 'Tarangire'],
                rating: 4.8,
                reviews: 134,
                url: './packages/tanzania-classic-tour.html'
            },
            {
                id: 'tanzania-honeymoon',
                name: 'Tanzania Honeymoon Safari',
                country: 'tanzania',
                duration: '8 Days',
                price: 'From $1,650',
                image: './images/top-safari-packages/serengeti--safari-4.jpg',
                description: 'Romantic safari experience perfect for couples and honeymooners.',
                highlights: ['Romantic Settings', 'Private Dinners', 'Luxury Lodges'],
                rating: 4.9,
                reviews: 76,
                url: './packages/tanzania-honeymoon.html'
            },

            {
                id: 'tanzania-highlights-overview',
                name: 'Tanzania Highlights Overview',
                country: 'tanzania',
                duration: '5 Days',
                price: 'Custom',
                image: './images/top-safari-packages/serengeti-safari-1.jpg',
                description: 'Curated Tanzania highlights – flexible custom trip.',
                highlights: ['Serengeti', 'Ngorongoro', 'Tarangire'],
                rating: 4.7,
                reviews: 61,
                url: './packages/tanzania.html'
            },

            // Rwanda Packages
            {
                id: 'rwanda-gorilla-trekking',
                name: 'Rwanda Gorilla Trekking',
                country: 'rwanda',
                duration: '3 Days',
                price: 'From $850',
                image: './images/top-safari-packages/rwanda-safari-1.jpg',
                description: 'Premium gorilla trekking experience in Rwanda\'s Volcanoes National Park.',
                highlights: ['Mountain Gorillas', 'Volcanoes NP', 'Luxury Lodges'],
                rating: 4.9,
                reviews: 112,
                url: './packages/rwanda-gorilla-trekking.html'
            },
            {
                id: 'rwanda-golden-monkey',
                name: 'Rwanda Golden Monkey Trek',
                country: 'rwanda',
                duration: '2 Days',
                price: 'From $650',
                image: './images/top-safari-packages/rwanda-safari-2.jpg',
                description: 'Encounter the rare and beautiful golden monkeys in bamboo forests.',
                highlights: ['Golden Monkeys', 'Bamboo Forest', 'Cultural Tours'],
                rating: 4.7,
                reviews: 58,
                url: './packages/rwanda-golden-monkey.html'
            },
            {
                id: 'rwanda-wildlife-culture',
                name: 'Rwanda Wildlife & Culture',
                country: 'rwanda',
                duration: '5 Days',
                price: 'From $1,100',
                image: './images/top-safari-packages/rwanda-safari-3.jpg',
                description: 'Comprehensive Rwanda experience combining wildlife and cultural immersion.',
                highlights: ['Gorillas', 'Cultural Villages', 'Genocide Memorial'],
                rating: 4.8,
                reviews: 89,
                url: './packages/rwanda-wildlife-culture.html'
            },

            {
                id: 'rwanda-kigali-cultural',
                name: 'Rwanda Kigali Cultural Tour',
                country: 'rwanda',
                duration: '2 Days',
                price: 'From $350',
                image: './images/top-safari-packages/rwanda-safari-1.jpg',
                description: 'Discover Kigali’s culture, cuisine, and history.',
                highlights: ['Kigali Tour', 'Culture', 'Museums'],
                rating: 4.5,
                reviews: 44,
                url: './packages/rwanda-kigali-cultural.html'
            },

            // Multi-Country Packages
            {
                id: 'east-africa-grand-tour',
                name: 'East Africa Grand Tour',
                country: 'multi-country',
                duration: '14 Days',
                price: 'From $2,450',
                image: './images/top-safari-packages/about_gisu_safaris2.jpg',
                description: 'Ultimate East African adventure covering all four countries.',
                highlights: ['4 Countries', 'Gorillas & Big Five', 'Cultural Immersion'],
                rating: 4.9,
                reviews: 67,
                url: './packages/multi-country.html'
            },
            {
                id: 'uganda-rwanda-gorillas',
                name: 'Uganda & Rwanda Gorilla Experience',
                country: 'multi-country',
                duration: '7 Days',
                price: 'From $1,650',
                image: './images/top-safari-packages/3-Day-Luxury-Gorilla-Trekking-Safari-in-Uganda-Bwindi-Gorilla-Tour.jpg',
                description: 'Double gorilla trekking experience in both Uganda and Rwanda.',
                highlights: ['Double Gorilla Trek', 'Bwindi & Volcanoes', 'Cultural Tours'],
                rating: 4.9,
                reviews: 94,
                url: './packages/multi-country.html'
            },
            {
                id: 'kenya-tanzania-migration',
                name: 'Kenya & Tanzania Migration Safari',
                country: 'multi-country',
                duration: '10 Days',
                price: 'From $1,850',
                image: './images/top-safari-packages/masai-mara-safari-1.jpg',
                description: 'Follow the Great Migration across Kenya and Tanzania.',
                highlights: ['Great Migration', 'Masai Mara', 'Serengeti'],
                rating: 4.8,
                reviews: 123,
                url: './packages/multi-country.html'
            }
        ];
    }

    // Toggle packages visibility
    togglePackages() {
        const container = document.getElementById('allPackagesContainer');
        const btn = document.getElementById('viewAllPackagesBtn');
        const btnText = document.getElementById('btnText');

        if (!this.isVisible) {
            // Show packages
            container.style.display = 'block';
            btnText.textContent = 'Hide Safari Packages';
            btn.querySelector('i').className = 'fas fa-eye-slash me-2';
            this.isVisible = true;

            // Always default to showing ALL packages when opened
            this.currentFilter = 'all';
            // Update active filter button UI if present
            const allBtn = document.querySelector('[data-filter="all"]');
            if (allBtn) {
                document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
                allBtn.classList.add('active');
            }

            // Load packages if not already loaded; otherwise re-render with 'all'
            if (!this.isLoaded) {
                this.loadPackages();
            } else {
                this.renderPackages();
            }

            // Smooth scroll to packages section
            setTimeout(() => {
                container.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            // Hide packages
            container.style.display = 'none';
            btnText.textContent = 'View All Safari Packages';
            btn.querySelector('i').className = 'fas fa-binoculars me-2';
            this.isVisible = false;
        }
    }

    // Load and display packages
    loadPackages() {
        const loadingDiv = document.getElementById('packagesLoading');
        const gridDiv = document.getElementById('allPackagesGrid');

        // Show loading indicator
        loadingDiv.style.display = 'block';
        gridDiv.innerHTML = '';

        // Simulate loading delay for better UX
        setTimeout(() => {
            this.renderPackages();
            loadingDiv.style.display = 'none';
            this.isLoaded = true;
        }, 1000);
    }

    // Render packages in grid
    renderPackages() {
        const gridDiv = document.getElementById('allPackagesGrid');
        const filteredPackages = this.getFilteredPackages();

        gridDiv.innerHTML = filteredPackages.map(pkg => this.createPackageCard(pkg)).join('');

        // Add fade-in animation
        setTimeout(() => {
            gridDiv.querySelectorAll('.package-card').forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('fade-in');
                }, index * 100);
            });
        }, 50);
    }

    // Get filtered packages based on current filter
    getFilteredPackages() {
        if (this.currentFilter === 'all') {
            // Exclude multi-country from the default "All" count to show 26 (UG 12, KE 5, TZ 5, RW 4)
            return this.packages.filter(pkg => pkg.country !== 'multi-country');
        }
        return this.packages.filter(pkg => pkg.country === this.currentFilter);
    }

    // Create individual package card HTML
    createPackageCard(pkg) {
        const stars = '★'.repeat(Math.floor(pkg.rating)) + (pkg.rating % 1 ? '☆' : '');
        
        return `
            <div class="col-lg-4 col-md-6">
                <article class="card border-0 shadow-sm h-100 safari-package-card hover-card package-card" data-country="${pkg.country}" style="opacity: 0; transform: translateY(30px); transition: all 0.6s ease;">
                    <div class="position-relative overflow-hidden">
                        <img src="${pkg.image}" class="card-img-top" alt="${pkg.name}" style="height: 250px; object-fit: cover;">
                        <div class="position-absolute top-0 end-0 m-3">
                            <span class="badge bg-primary">${pkg.duration}</span>
                        </div>
                        <div class="position-absolute bottom-0 start-0 m-3">
                            <span class="badge bg-dark bg-opacity-75">${pkg.country.charAt(0).toUpperCase() + pkg.country.slice(1)}</span>
                        </div>
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-primary fw-bold">${pkg.name}</h5>
                        <p class="card-text flex-grow-1">${pkg.description}</p>
                        
                        <div class="mb-3">
                            <small class="text-muted d-block">Highlights:</small>
                            <div class="d-flex flex-wrap gap-1">
                                ${pkg.highlights.map(highlight => 
                                    `<span class="badge bg-light text-dark">${highlight}</span>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="text-primary fw-bold fs-5">${pkg.price}</span>
                            <small class="text-muted">${pkg.duration}</small>
                        </div>
                        
                        <div class="rating mb-3">
                            <span class="text-warning">${stars}</span>
                            <small class="text-muted ms-1">${pkg.rating} (${pkg.reviews} reviews)</small>
                        </div>
                    </div>
                    <div class="card-footer bg-transparent">
                        <a href="${pkg.url}" class="btn btn-primary w-100">
                            <i class="fas fa-eye me-2"></i>View Details & Book
                        </a>
                    </div>
                </article>
            </div>
        `;
    }

    // Filter packages by country
    filterPackages(country) {
        this.currentFilter = country;
        
        // Update active filter button without relying on event.target
        const buttons = document.querySelectorAll('[data-filter]');
        buttons.forEach(btn => btn.classList.remove('active'));
        const toActivate = document.querySelector(`[data-filter="${country}"]`);
        if (toActivate) toActivate.classList.add('active');
        
        // Re-render packages
        this.renderPackages();
    }
}

// Initialize the packages loader and expose globally
window.safariPackagesLoader = new SafariPackagesLoader();

// Global functions for HTML onclick events
function toggleAllPackages() {
    safariPackagesLoader.togglePackages();
}

function filterPackages(country) {
    safariPackagesLoader.filterPackages(country);
}

// Add CSS for fade-in animation
const style = document.createElement('style');
style.textContent = `
    .package-card.fade-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
    
    .safari-package-card:hover {
        transform: translateY(-10px) scale(1.02);
        box-shadow: 0 15px 40px rgba(0,0,0,0.15);
    }
    
    .safari-package-card .card-img-top {
        transition: all 0.3s ease;
    }
    
    .safari-package-card:hover .card-img-top {
        transform: scale(1.05);
    }
    
    .btn-group .btn.active {
        background-color: var(--primary-color, #2E7D32);
        border-color: var(--primary-color, #2E7D32);
        color: white;
    }
    
    .package-card {
        transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
`;
document.head.appendChild(style);