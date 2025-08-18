// ==========================================
// GISU SAFARIS - MAIN JAVASCRIPT FILE
// Enhanced Safari Website Functionality
// ==========================================

(function() {
    'use strict';

    // === NAVBAR SCROLL EFFECT ===
    function initNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        function updateNavbar() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        // Initial check
        updateNavbar();
        
        // Add scroll listener with throttling
        let ticking = false;
        window.addEventListener('scroll', function() {
            if (!ticking) {
                requestAnimationFrame(function() {
                    updateNavbar();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // === HERO SLIDER FUNCTIONALITY ===
    function initHeroSlider() {
        const slides = document.querySelectorAll('.hero-slide');
        if (!slides.length) return;

        let currentSlide = 0;
        let slideInterval;
        let isTransitioning = false;

        function showSlide(index) {
            if (isTransitioning) return;
            isTransitioning = true;

            // Remove active from current slide
            slides[currentSlide].classList.remove('active');
            
            // Update current slide index
            currentSlide = index >= slides.length ? 0 : (index < 0 ? slides.length - 1 : index);
            
            // Add active to new slide
            setTimeout(() => {
                slides[currentSlide].classList.add('active');
                isTransitioning = false;
            }, 50);
        }

    // === VIEW ALL SAFARI PACKAGES BUTTON ===
    function initViewAllPackagesButton() {
        try {
            const btn = document.getElementById('viewAllPackagesBtn');
            if (!btn) return;

            // Open the full packages page for a consistent experience across devices
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const url = './packages/index.html';
                // Use location.assign to keep history
                window.location.assign(url);
            });
        } catch (e) {
            console.warn('initViewAllPackagesButton failed:', e);
        }
    }

        function nextSlide() {
            showSlide(currentSlide + 1);
        }

        function startSlider() {
            slideInterval = setInterval(nextSlide, 2000); // 2 seconds as requested
        }

        function stopSlider() {
            clearInterval(slideInterval);
        }

        // Initialize slider
        startSlider();

        // Pause on hover
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            heroSection.addEventListener('mouseenter', stopSlider);
            heroSection.addEventListener('mouseleave', startSlider);
        }

        // Pause when page is not visible
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                stopSlider();
            } else {
                startSlider();
            }
        });

        return {
            next: nextSlide,
            show: showSlide,
            start: startSlider,
            stop: stopSlider
        };
    }

    // === SMOOTH SCROLL FOR ANCHOR LINKS ===
    function initSmoothScroll() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const headerHeight = document.querySelector('.navbar')?.offsetHeight || 70;
                    const targetPosition = target.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // === COMPREHENSIVE FADE-UP ANIMATIONS ON SCROLL ===
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add fade-in class for smooth animation
                    entry.target.classList.add('fade-in');
                    
                    // Add additional animations based on element type
                    if (entry.target.classList.contains('safari-package-card')) {
                        setTimeout(() => {
                            entry.target.style.transform = 'translateY(0)';
                            entry.target.style.opacity = '1';
                        }, 100);
                    }
                    
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all fade elements
        const fadeElements = document.querySelectorAll('.fade-element');
        fadeElements.forEach(el => {
            observer.observe(el);
        });

        // Also observe cards and sections for legacy support
        const animatedElements = document.querySelectorAll(
            '.safari-package-card, .attraction-card, section'
        );
        
        animatedElements.forEach(el => {
            if (!el.classList.contains('fade-element')) {
                observer.observe(el);
            }
        });
    }

    // === LAZY LOADING FOR IMAGES ===
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver(function(entries, observer) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.remove('loading');
                        imageObserver.unobserve(img);
                    }
                });
            });

            const images = document.querySelectorAll('img[data-src], img.loading');
            images.forEach(img => imageObserver.observe(img));
        }
    }

    // === TRUST INDICATORS (SAFE STUB) ===
    function showTrustIndicators() {
        // Placeholder to avoid breaking init flow if specific markup not present
        // Optionally, we can add small badges/logos later
    }

    // === ICONS: ENSURE FONT AWESOME ===
    function ensureFontAwesome() {
        try {
            const hasFA = document.querySelector('link[href*="font-awesome"], link[href*="/all.min.css"], link[href*="/fontawesome"]');
            if (!hasFA) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
                link.crossOrigin = 'anonymous';
                document.head.appendChild(link);
                console.log('[Icons] Font Awesome injected');
            }
        } catch (e) {
            console.warn('ensureFontAwesome failed:', e);
        }
    }

    // === SAFE STUBS FOR OPTIONAL FEATURES ===
    function showNotification(message, type = 'info') {
        try { console.log(`[Notify:${type}]`, message); } catch (_) {}
    }

    function initFormEnhancements() {
        // Enhance forms if needed (placeholder)
    }

    // === INITIALIZATION ===
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        // Initialize all features (guarded)
        try {
            if (typeof initNavbarScroll === 'function') initNavbarScroll();
            if (typeof initHeroSlider === 'function') initHeroSlider();
            if (typeof initSmoothScroll === 'function') initSmoothScroll();
            if (typeof initScrollAnimations === 'function') initScrollAnimations();
            if (typeof initLazyLoading === 'function') initLazyLoading();
            if (typeof initFormEnhancements === 'function') initFormEnhancements();
            if (typeof ensureFontAwesome === 'function') ensureFontAwesome();
            if (typeof initWhatsAppButton === 'function') initWhatsAppButton();
            if (typeof ensureWhatsAppWidget === 'function') ensureWhatsAppWidget();
            if (typeof ensureAISafariBotLoaded === 'function') ensureAISafariBotLoaded();
            if (typeof initAccessibility === 'function') initAccessibility();
            if (typeof initSafariFeatures === 'function') initSafariFeatures();
            if (typeof initViewAllPackagesButton === 'function') initViewAllPackagesButton();
            if (typeof optimizePerformance === 'function') optimizePerformance();

            console.log('Gisu Safaris website initialized successfully!');
        } catch (error) {
            console.error('Error initializing website:', error);
        }
    }

    // === WHATSAPP WIDGET HELPERS & GLOBALS ===
    const phoneNumber = '61478914106';
    const chatWidget = () => document.getElementById('whatsappChat');
    const messageInput = () => document.getElementById('whatsappMessage');

    function toggleWhatsAppChatInternal() {
        const widget = chatWidget();
        if (!widget) return;
        widget.classList.toggle('active');
        if (widget.classList.contains('active')) {
            setTimeout(() => { const inp = messageInput(); if (inp) inp.focus(); }, 300);
        }
    }

    function sendWhatsAppMessageInternal() {
        const input = messageInput();
        if (!input) return;
        const message = (input.value || '').trim();
        if (!message) { input.focus(); return; }
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        input.value = '';
        toggleWhatsAppChatInternal();
    }

    function bindWhatsAppWidgetEvents() {
        const openBtn = document.querySelector('.whatsapp-btn');
        const closeBtn = document.querySelector('.whatsapp-close-btn');
        const sendBtn = document.querySelector('.whatsapp-send-btn');
        const input = messageInput();

        if (openBtn) openBtn.addEventListener('click', () => toggleWhatsAppChatInternal());
        if (closeBtn) closeBtn.addEventListener('click', () => toggleWhatsAppChatInternal());
        if (sendBtn) sendBtn.addEventListener('click', () => sendWhatsAppMessageInternal());
        if (input) input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendWhatsAppMessageInternal();
            }
        });

        // Delegated fallbacks to ensure clicks work even if dynamic timing changes
        if (!window.__whatsappDelegated) {
            window.__whatsappDelegated = true;
            document.addEventListener('click', (e) => {
                const open = e.target && e.target.closest && e.target.closest('.whatsapp-btn');
                const close = e.target && e.target.closest && e.target.closest('.whatsapp-close-btn');
                const send = e.target && e.target.closest && e.target.closest('.whatsapp-send-btn');
                if (open) { e.preventDefault(); toggleWhatsAppChatInternal(); }
                if (close) { e.preventDefault(); toggleWhatsAppChatInternal(); }
                if (send) { e.preventDefault(); sendWhatsAppMessageInternal(); }
            });
        }
    }

    function initWhatsAppButton() {
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        if (!whatsappBtn) return;

        const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReduced) {
            whatsappBtn.style.animation = 'pulse 1.8s 3';
            const stopAnimation = () => { whatsappBtn.style.animation = 'none'; };
            whatsappBtn.addEventListener('mouseenter', stopAnimation, { once: true });
            whatsappBtn.addEventListener('click', stopAnimation, { once: true });
            whatsappBtn.addEventListener('focus', stopAnimation, { once: true });
        }
    }

    // Expose for legacy inline handlers
    if (!window.toggleWhatsAppChat) window.toggleWhatsAppChat = toggleWhatsAppChatInternal;
    if (!window.sendWhatsAppMessage) window.sendWhatsAppMessage = sendWhatsAppMessageInternal;

    // === ENSURE WHATSAPP WIDGET EXISTS SITE-WIDE ===
    function ensureWhatsAppWidget() {
        try {
            const hasWrapper = !!document.querySelector('.floating-whatsapp');
            const hasExistingWidget = !!document.querySelector('.whatsapp-widget');

            // If page already has a WhatsApp widget section (like index.html), just bind events
            if (hasExistingWidget && !hasWrapper) {
                if (!window.__whatsappWidgetInitialized) {
                    window.__whatsappWidgetInitialized = true;
                    bindWhatsAppWidgetEvents();
                    initWhatsAppButton();
                }
                return;
            }

            if (hasWrapper) {
                // Already injected; ensure events are bound
                if (!window.__whatsappWidgetInitialized) {
                    window.__whatsappWidgetInitialized = true;
                    bindWhatsAppWidgetEvents();
                    initWhatsAppButton();
                }
                return;
            }

            // Inject minimal widget markup
            const wrapper = document.createElement('div');
            wrapper.className = 'floating-whatsapp';
            wrapper.innerHTML = `
                <div class="whatsapp-widget">
                    <div class="whatsapp-chat" id="whatsappChat">
                        <button class="whatsapp-close-btn" aria-label="Close WhatsApp chat">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="whatsapp-chat-header">
                            <img src="https://gisusafaris.com/img/gisu_safaris.png" alt="Gisu Safaris">
                            <div class="whatsapp-chat-info">
                                <h6>Gisu Safaris</h6>
                                <small>Typically replies instantly</small>
                            </div>
                        </div>
                        <div class="whatsapp-chat-body">
                            <p>👋 Hello! Welcome to Gisu Safaris!</p>
                            <p>How can we help you plan your perfect East African safari adventure today?</p>
                            <div class="whatsapp-input-group">
                                <input type="text" class="whatsapp-input" id="whatsappMessage" placeholder="Type your message..." maxlength="500">
                                <button class="whatsapp-send-btn" aria-label="Send WhatsApp message">
                                    <i class="fas fa-paper-plane"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <button class="whatsapp-btn" aria-label="Open WhatsApp chat">
                        <i class="fab fa-whatsapp"></i>
                    </button>
                </div>`;
            document.body.appendChild(wrapper);

            if (!window.__whatsappWidgetInitialized) {
                window.__whatsappWidgetInitialized = true;
                bindWhatsAppWidgetEvents();
                initWhatsAppButton();
            }
        } catch (err) {
            console.warn('WhatsApp widget initialization failed:', err);
        }
    }

    // === AI SAFARI BOT LOADER ===
    function ensureAISafariBotLoaded() {
        try {
            console.log('[AI Bot] ensure loader running');
            if (document.getElementById('ai-bot-script')) {
                return; // already requested
            }

            const scripts = Array.from(document.scripts || []);
            const hasWidget = !!document.getElementById('ai-safari-bot');
            const hasBotScript = scripts.some(s => (s.src || '').includes('ai-safari-bot-enhanced.js'));
            if (hasWidget || hasBotScript) return;

            // Proactively remove any old bot scripts that might conflict on some devices
            try {
                const oldSelectors = [
                    'script[src*="ai-safari-bot.js"]',
                    'script[src*="ai-personalization.js"]'
                ];
                oldSelectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        console.warn('[AI Bot] removing old bot script:', el.src || sel);
                        el.parentNode && el.parentNode.removeChild(el);
                    });
                });
            } catch (_) { /* ignore */ }

            const script = document.createElement('script');
            script.id = 'ai-bot-script';

            let botUrl = 'js/ai-safari-bot-enhanced.js';
            try {
                const thisScript = document.currentScript || scripts.find(s => (s.src || '').includes('js/main.js')) || scripts.find(s => (s.src || '').endsWith('main.js'));
                const base = thisScript ? thisScript.src : (location.origin + location.pathname);
                botUrl = new URL('ai-safari-bot-enhanced.js', base).toString();
            } catch (_) { /* fallback used */ }

            // Add a cache-busting version to ensure mobile gets the latest script
            const ver = 'v=20250818-1';
            botUrl += (botUrl.includes('?') ? '&' : '?') + ver;

            script.src = botUrl;
            // Use async to run as soon as possible (helps when injected late or under file://)
            script.async = true;
            script.onload = () => console.log('[AI Bot] loaded:', botUrl);
            script.onerror = (e) => console.warn('[AI Bot] failed to load:', botUrl, e);
            document.body.appendChild(script);

            // One-time retry if widget not present after load window
            setTimeout(() => {
                if (!document.getElementById('ai-safari-bot')) {
                    const retry = document.createElement('script');
                    retry.id = 'ai-bot-script-retry';
                    retry.src = botUrl;
                    retry.async = true;
                    document.body.appendChild(retry);
                    console.warn('[AI Bot] retrying injection');
                }
            }, 2500);

            // Defensive: poll for constructor and explicitly init if needed
            let attempts = 0;
            const maxAttempts = 12; // ~6s
            const poll = setInterval(() => {
                attempts++;
                if (window.SafariAIBotEnhanced) {
                    try {
                        if (!document.getElementById('ai-safari-bot')) {
                            console.log('[AI Bot] constructor detected; forcing init');
                            window.SafariAIBotEnhanced.getInstance();
                        }
                        clearInterval(poll);
                    } catch (e) {
                        console.warn('[AI Bot] force init error:', e);
                        clearInterval(poll);
                    }
                } else if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    console.warn('[AI Bot] constructor not found after wait');
                }
            }, 500);
        } catch (err) {
            console.warn('AI Safari Bot script injection failed:', err);
        }
    }

    // === PERFORMANCE OPTIMIZATIONS ===
    function optimizePerformance() {
        // Preload critical images
        const criticalImages = [
            'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5', // Gorilla image
            'https://images.unsplash.com/photo-1557804506-669a67965ba0'   // Safari image
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            document.head.appendChild(link);
        });
    }

    // === ACCESSIBILITY ENHANCEMENTS ===
    function initAccessibility() {
        // Add keyboard navigation for dropdowns
        const dropdowns = document.querySelectorAll('.dropdown-toggle');
        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });

        // Improve focus visibility
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-navigation');
        });
    }

    // === SAFARI PACKAGE CARD CAROUSEL FUNCTIONALITY ===
    function initCardCarousels() {
        const carousels = document.querySelectorAll('.card-image-carousel');
        
        carousels.forEach((carousel, carouselIndex) => {
            const images = carousel.querySelectorAll('.carousel-img');
            const indicators = carousel.querySelectorAll('.indicator');
            let currentSlide = 0;
            let autoRotateInterval;
            
            // Auto-rotate images every 2 seconds
            function startAutoRotate() {
                autoRotateInterval = setInterval(() => {
                    showNextSlide();
                }, 2000);
            }
            
            // Stop auto-rotation
            function stopAutoRotate() {
                clearInterval(autoRotateInterval);
            }
            
            // Show specific slide
            function showSlide(index) {
                // Hide all images
                images.forEach(img => {
                    img.classList.remove('active');
                    img.style.opacity = '0';
                    img.style.transform = 'scale(1)';
                });
                
                // Remove active class from all indicators
                indicators.forEach(indicator => {
                    indicator.classList.remove('active');
                });
                
                // Show current image
                if (images[index]) {
                    images[index].classList.add('active');
                    images[index].style.opacity = '1';
                    images[index].style.transform = 'scale(1)';
                }
                
                // Activate current indicator
                if (indicators[index]) {
                    indicators[index].classList.add('active');
                }
                
                currentSlide = index;
            }
            
            // Show next slide
            function showNextSlide() {
                const nextIndex = (currentSlide + 1) % images.length;
                showSlide(nextIndex);
            }
            
            // Add click handlers to indicators
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    showSlide(index);
                    stopAutoRotate();
                    // Restart auto-rotation after manual interaction
                    setTimeout(startAutoRotate, 5000);
                });
                
                indicator.addEventListener('mouseenter', () => {
                    indicator.style.transform = 'scale(1.2)';
                });
                
                indicator.addEventListener('mouseleave', () => {
                    if (!indicator.classList.contains('active')) {
                        indicator.style.transform = 'scale(1)';
                    }
                });
            });
            
            // Pause auto-rotation on carousel hover
            carousel.addEventListener('mouseenter', () => {
                stopAutoRotate();
                // Add subtle zoom effect to active image
                const activeImg = carousel.querySelector('.carousel-img.active');
                if (activeImg) {
                    activeImg.style.transform = 'scale(1.05)';
                }
            });
            
            carousel.addEventListener('mouseleave', () => {
                startAutoRotate();
                // Remove zoom effect
                const activeImg = carousel.querySelector('.carousel-img.active');
                if (activeImg) {
                    activeImg.style.transform = 'scale(1)';
                }
            });
            
            // Touch/swipe support for mobile
            let touchStartX = 0;
            let touchEndX = 0;
            
            carousel.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                stopAutoRotate();
            });
            
            carousel.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
                setTimeout(startAutoRotate, 2000);
            });
            
            function handleSwipe() {
                const swipeThreshold = 50;
                const diff = touchStartX - touchEndX;
                
                if (Math.abs(diff) > swipeThreshold) {
                    if (diff > 0) {
                        // Swiped left - next slide
                        showNextSlide();
                    } else {
                        // Swiped right - previous slide
                        const prevIndex = (currentSlide - 1 + images.length) % images.length;
                        showSlide(prevIndex);
                    }
                }
            }
            
            // Initialize carousel
            if (images.length > 0) {
                showSlide(0);
                if (images.length > 1) {
                    startAutoRotate();
                }
            }
        });
    }

    // === ENHANCED SAFARI FEATURES ===
    function initSafariFeatures() {
        // Initialize carousels first
        initCardCarousels();
        
        // Enhanced hover effects for all interactive elements
        const interactiveElements = document.querySelectorAll('.hover-card, .hover-button, .hover-image');
        
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', function() {
                this.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            });
        });

        // Safari card enhanced interactions
        const safariCards = document.querySelectorAll('.safari-package-card');
        safariCards.forEach(card => {
            card.addEventListener('mouseenter', function() {
                // Add glow effect
                this.style.boxShadow = '0 25px 50px rgba(46, 125, 50, 0.15)';
                
                // Animate price highlighting
                const price = this.querySelector('.text-primary');
                if (price) {
                    price.style.transform = 'scale(1.1)';
                    price.style.transition = 'transform 0.3s ease';
                }
                
                // Enhance carousel indicators visibility
                const indicators = this.querySelectorAll('.indicator');
                indicators.forEach(indicator => {
                    indicator.style.opacity = '1';
                    indicator.style.transform = indicator.classList.contains('active') ? 'scale(1.2)' : 'scale(1.1)';
                });
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.boxShadow = '0 8px 30px rgba(0,0,0,0.08)';
                
                const price = this.querySelector('.text-primary');
                if (price) {
                    price.style.transform = 'scale(1)';
                }
                
                // Reset indicators
                const indicators = this.querySelectorAll('.indicator');
                indicators.forEach(indicator => {
                    indicator.style.transform = indicator.classList.contains('active') ? 'scale(1.2)' : 'scale(1)';
                });
            });
        });

        // Western client-focused features
        initWesternClientFeatures();

        // Add click tracking for analytics (placeholder)
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-track]');
            if (target) {
                const action = target.dataset.track;
                // Replace with actual analytics tracking (Google Analytics, etc.)
                console.log('Tracking action:', action);
                
                // Example: gtag('event', 'click', { action: action });
            }
        });
    }

    // === WESTERN CLIENT OPTIMIZATION ===
    function initWesternClientFeatures() {
        // Currency display based on user location (placeholder)
        const priceElements = document.querySelectorAll('[data-price]');
        priceElements.forEach(element => {
            // Could implement currency conversion here
            // const userCurrency = detectUserCurrency();
            // convertPriceTo(element, userCurrency);
        });

        // Add testimonials rotation for social proof
        rotateSocialProof();

        // Initialize trust indicators
        showTrustIndicators();
    }

    // === SOCIAL PROOF ROTATION ===
    function rotateSocialProof() {
        const testimonials = [
            { text: "Amazing gorilla trekking experience!", author: "Sarah M., USA" },
            { text: "Best safari company in East Africa!", author: "James R., UK" },
            { text: "Professional guides, luxury accommodations!", author: "Emma L., Canada" },
            { text: "Unforgettable wildlife encounters!", author: "Michael B., Australia" }
        ];

        // Rotate testimonials every 5 seconds
        let currentTestimonial = 0;
        const testimonialElement = document.querySelector('.rotating-testimonial');
        
        if (testimonialElement) {
            setInterval(() => {
                testimonialElement.style.opacity = '0';
                setTimeout(() => {
                    testimonialElement.innerHTML = `
                        <p>"${testimonials[currentTestimonial].text}"</p>
                        <small>- ${testimonials[currentTestimonial].author}</small>
                    `;
                    testimonialElement.style.opacity = '1';
                    currentTestimonial = (currentTestimonial + 1) % testimonials.length;
                }, 300);
            }, 5000);
        }
    }

    // === WINDOW LOAD OPTIMIZATIONS ===
    window.addEventListener('load', function() {
        // Remove any loading classes
        document.body.classList.remove('loading');
        
        // Initialize additional features that need full page load
        setTimeout(() => {
            // Any additional animations or features
        }, 100);
    });

    // === ERROR HANDLING ===
    window.addEventListener('error', function(e) {
        // e.error can be null for some errors; log message and target as fallback
        const details = e && (e.error || e.message || e.filename || 'unknown');
        console.error('JavaScript error:', details);
        // Optionally send to error tracking service
    });

    // Start initialization (with fallback if init is not defined)
    if (typeof init === 'function') {
        init();
    } else {
        console.warn('init() not found, running fallback bootstrap');
        try {
            // Minimal critical boot sequence to ensure widgets load
            initNavbarScroll && initNavbarScroll();
            initHeroSlider && initHeroSlider();
            initSmoothScroll && initSmoothScroll();
            initScrollAnimations && initScrollAnimations();
            initLazyLoading && initLazyLoading();
            ensureFontAwesome && ensureFontAwesome();
            initWhatsAppButton && initWhatsAppButton();
            ensureWhatsAppWidget && ensureWhatsAppWidget();
            ensureAISafariBotLoaded && ensureAISafariBotLoaded();
            initAccessibility && initAccessibility();
            initSafariFeatures && initSafariFeatures();
            optimizePerformance && optimizePerformance();
        } catch (e) {
            console.error('Fallback init error:', e);
        }
    }

    // === UTILITY FUNCTIONS ===
    window.GisuSafaris = {
        showNotification: showNotification,
        utils: {
            debounce: function(func, wait) {
                let timeout;
                return function executedFunction(...args) {
                    const later = () => {
                        clearTimeout(timeout);
                        func(...args);
                    };
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                };
            },
            throttle: function(func, delay) {
                let timeoutId;
                let lastExecTime = 0;
                return function (...args) {
                    const currentTime = Date.now();
                    
                    if (currentTime - lastExecTime > delay) {
                        func.apply(this, args);
                        lastExecTime = currentTime;
                    } else {
                        clearTimeout(timeoutId);
                        timeoutId = setTimeout(() => {
                            func.apply(this, args);
                            lastExecTime = Date.now();
                        }, delay - (currentTime - lastExecTime));
                    }
                };
            }
        }
    };

})();
