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

    // === OUR STORY SLIDER FUNCTIONALITY ===
    function initStorySlider() {
        const slides = document.querySelectorAll('.story-slider .story-slide');
        if (!slides.length) return;

        let current = 0;
        let intervalId;

        function next() {
            slides[current].classList.remove('active');
            current = (current + 1) % slides.length;
            slides[current].classList.add('active');
        }

        function start() {
            clearInterval(intervalId);
            intervalId = setInterval(next, 2000);
        }

        function stop() {
            clearInterval(intervalId);
        }

        // start rotation
        start();

        // Pause on hover
        const container = document.querySelector('.story-slider');
        if (container) {
            container.addEventListener('mouseenter', stop);
            container.addEventListener('mouseleave', start);
        }

        // Pause when tab hidden
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) stop(); else start();
        });

        return { start, stop, next };
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

    // === NAVBAR ACTIVE STATE FOR PACKAGE PAGES ===
    function initNavbarActiveForPackages() {
        try {
            const path = (window.location && window.location.pathname || '').toLowerCase();
            if (!/\/packages\//.test(path)) return; // Only adjust on package pages

            const navbar = document.querySelector('.navbar');
            if (!navbar) return;

            // Clear any existing active states within navbar to avoid wrong highlights (e.g., Contact Us)
            navbar.querySelectorAll('.nav-link.active, .dropdown-item.active').forEach(el => {
                el.classList.remove('active');
                el.removeAttribute('aria-current');
            });

            // Find the Safari Packages dropdown toggle by text
            const toggles = Array.from(navbar.querySelectorAll('.nav-item.dropdown .nav-link.dropdown-toggle'));
            const packagesToggle = toggles.find(a => (a.textContent || '').trim().toLowerCase().includes('safari packages')) || null;
            if (packagesToggle) {
                packagesToggle.classList.add('active');
                packagesToggle.setAttribute('aria-current', 'page');
            }

            // Determine which submenu item to activate based on filename
            const file = path.split('/').pop() || '';
            let key = '';
            if (file.startsWith('uganda')) key = 'uganda';
            else if (file.startsWith('kenya')) key = 'kenya';
            else if (file.startsWith('tanzania')) key = 'tanzania';
            else if (file.startsWith('rwanda')) key = 'rwanda';
            else if (file.startsWith('multi-country')) key = 'multi-country';

            if (key) {
                const menu = packagesToggle ? packagesToggle.parentElement.querySelector('.dropdown-menu') : navbar.querySelector('.dropdown-menu');
                if (menu) {
                    let selector = '';
                    if (key === 'multi-country') selector = 'a[href*="multi-country.html"]';
                    else selector = `a[href$="${key}.html"]`;
                    const link = menu.querySelector(selector);
                    if (link) {
                        link.classList.add('active');
                        link.setAttribute('aria-current', 'page');
                    }
                }
            }

            // Ensure Contact Us isn't highlighted
            const contact = Array.from(navbar.querySelectorAll('a.nav-link')).find(a => ((a.textContent || '').trim().toLowerCase().includes('contact')));
            if (contact) contact.classList.remove('active');
        } catch (e) {
            try { console.warn('initNavbarActiveForPackages failed:', e); } catch (_) {}
        }
    }

    // === NORMALIZE WHATSAPP NUMBERS SITE-WIDE ===
    function normalizeWhatsAppNumbers() {
        try {
            const preferred = '+61478914106';
            const preferredRaw = '61478914106';
            const legacyNumbers = [
                '+61470133869', '61470133869',
                // add any other known legacy variants here if discovered later
            ];

            // Update hrefs on load
            const anchors = document.querySelectorAll('a[href]');
            anchors.forEach(a => {
                let href = a.getAttribute('href') || '';
                if (!href) return;

                const lower = href.toLowerCase();
                const isWA = lower.includes('wa.me') || lower.includes('whatsapp.com/send');
                const isTel = lower.startsWith('tel:');
                if (!(isWA || isTel)) return;

                legacyNumbers.forEach(old => {
                    if (!old) return;
                    href = href.replaceAll(old, preferredRaw).replaceAll(encodeURIComponent(old), encodeURIComponent(preferredRaw));
                });

                // Also normalize any leading + encodings
                href = href.replaceAll('%2B' + preferredRaw, preferredRaw).replaceAll('+' + preferredRaw, preferredRaw);

                // Ensure wa.me uses raw digits only
                if (isWA) {
                    href = href.replace(/(wa\.me\/)\+?/i, '$1');
                }

                a.setAttribute('href', href);
            });

            // Replace visible text nodes that contain legacy numbers
            try {
                const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
                const nodes = [];
                let n;
                while ((n = walker.nextNode())) nodes.push(n);
                nodes.forEach(node => {
                    let t = node.nodeValue;
                    if (!t) return;
                    legacyNumbers.forEach(old => {
                        if (!old) return;
                        if (t.includes(old)) t = t.replaceAll(old, preferred);
                    });
                    // also cover spaced or formatted variants (basic): 6147 013 3869 -> 61478914106
                    t = t.replace(/6\s*1\s*4\s*7\s*0\s*1\s*3\s*3\s*8\s*6\s*9/g, preferred);
                    if (t !== node.nodeValue) node.nodeValue = t;
                });
            } catch (_) { /* non-fatal */ }

            // Intercept clicks to enforce preferred number even if DOM changed later
            if (!window.__waNumberNormalized) {
                window.__waNumberNormalized = true;
                document.addEventListener('click', function(e) {
                    const a = e.target && e.target.closest && e.target.closest('a[href]');
                    if (!a) return;
                    let href = a.getAttribute('href') || '';
                    const lower = href.toLowerCase();
                    if (!(lower.includes('wa.me') || lower.includes('whatsapp.com/send') || lower.startsWith('tel:'))) return;
                    legacyNumbers.forEach(old => {
                        if (!old) return;
                        href = href.replaceAll(old, preferredRaw).replaceAll(encodeURIComponent(old), encodeURIComponent(preferredRaw));
                    });
                    href = href.replace(/(wa\.me\/)\+?/i, '$1');
                    a.setAttribute('href', href);
                }, true);
            }
        } catch (e) {
            try { console.warn('normalizeWhatsAppNumbers failed:', e); } catch (_) {}
        }
    }

    // === MULTI-COUNTRY PAGE: YOUTUBE VIDEO CONTROLS ===
    function initIncludedVideoControls() {
        try {
            const iframe = document.getElementById('includedVideo');
            const wrapper = document.getElementById('includedVideoWrapper');
            if (!iframe || !wrapper) return; // Only on multi-country page

            const playBtn = document.getElementById('includedVideoPlayBtn');
            const pauseBtn = document.getElementById('includedVideoPauseBtn');
            const stopBtn = document.getElementById('includedVideoStopBtn');
            const muteBtn = document.getElementById('includedVideoMuteToggle');
            const fsBtn = document.getElementById('includedVideoFullscreenBtn');

            // Load YouTube Iframe API once
            function loadYT() {
                return new Promise((resolve) => {
                    if (window.YT && window.YT.Player) return resolve(window.YT);
                    const tag = document.createElement('script');
                    tag.src = 'https://www.youtube.com/iframe_api';
                    document.head.appendChild(tag);
                    const prev = window.onYouTubeIframeAPIReady;
                    window.onYouTubeIframeAPIReady = function() {
                        if (typeof prev === 'function') { try { prev(); } catch(_) {} }
                        resolve(window.YT);
                    };
                });
            }

            let player = null;
            loadYT().then((YT) => {
                player = new YT.Player('includedVideo', {
                    events: {
                        onReady: () => { try { player.mute(); } catch(_) {} }
                    },
                    playerVars: {
                        start: 102,
                        autoplay: 0,
                        controls: 0,
                        mute: 1,
                        loop: 1,
                        playlist: 'siqAfzwCVuw',
                        modestbranding: 1,
                        playsinline: 1,
                        rel: 0,
                        disablekb: 1
                    }
                });

                function updateMuteButton() {
                    if (!muteBtn) return;
                    const span = muteBtn.querySelector('span');
                    const icon = muteBtn.querySelector('i');
                    const muted = (() => { try { return player.isMuted(); } catch(_) { return true; } })();
                    if (muted) {
                        muteBtn.setAttribute('aria-label', 'Unmute video');
                        if (span) span.textContent = 'Unmute';
                        if (icon) { icon.classList.remove('fa-volume-up'); icon.classList.add('fa-volume-mute'); }
                    } else {
                        muteBtn.setAttribute('aria-label', 'Mute video');
                        if (span) span.textContent = 'Mute';
                        if (icon) { icon.classList.remove('fa-volume-mute'); icon.classList.add('fa-volume-up'); }
                    }
                }

                function playWithSound() {
                    try { player.unMute(); } catch(_) {}
                    try { player.playVideo(); } catch(_) {}
                    updateMuteButton();
                }
                function pause() { try { player.pauseVideo(); } catch(_) {} }
                function stop() { try { player.stopVideo(); } catch(_) {} }
                function toggleMute() {
                    try { if (player.isMuted()) player.unMute(); else player.mute(); } catch(_) {}
                    updateMuteButton();
                }
                function fullscreen() {
                    const el = iframe;
                    if (el.requestFullscreen) el.requestFullscreen();
                    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
                    else if (el.msRequestFullscreen) el.msRequestFullscreen();
                }

                if (playBtn) playBtn.addEventListener('click', (e) => { e.preventDefault(); playWithSound(); });
                if (pauseBtn) pauseBtn.addEventListener('click', (e) => { e.preventDefault(); pause(); });
                if (stopBtn) stopBtn.addEventListener('click', (e) => { e.preventDefault(); stop(); });
                if (muteBtn) muteBtn.addEventListener('click', (e) => { e.preventDefault(); toggleMute(); });
                if (fsBtn) fsBtn.addEventListener('click', (e) => { e.preventDefault(); fullscreen(); });

                wrapper.addEventListener('click', (e) => {
                    const onCtrl = e.target && e.target.closest && e.target.closest('.video-controls');
                    if (onCtrl) return;
                    playWithSound();
                });

                // Initial sync of mute button UI
                setTimeout(updateMuteButton, 400);
            });
        } catch (e) {
            try { console.warn('initIncludedVideoControls failed:', e); } catch(_) {}
        }
    }

    // === ANALYTICS LOADER (GA4 / GTM) ===
    function ensureAnalyticsLoaded() {
        try {
            if (window.__analyticsLoaded) return;

            const metaGTM = (document.querySelector('meta[name="gtm-id"]')?.getAttribute('content') || '').trim();
            const metaGA4 = (document.querySelector('meta[name="ga-measurement-id"]')?.getAttribute('content') || '').trim();
            const GTM = ((window.GTM_CONTAINER_ID || metaGTM) || '').trim();
            const GA4 = ((window.GA_MEASUREMENT_ID || metaGA4) || '').trim();

            if (GTM) {
                // Minimal GTM bootstrap
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
                const gtm = document.createElement('script');
                gtm.async = true;
                gtm.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM)}`;
                document.head.appendChild(gtm);
                window.__analyticsLoaded = true;
                return;
            }

            if (GA4) {
                // GA4 loader
                const ga = document.createElement('script');
                ga.async = true;
                ga.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4)}`;
                document.head.appendChild(ga);

                window.dataLayer = window.dataLayer || [];
                function gtag(){ window.dataLayer.push(arguments); }
                window.gtag = window.gtag || gtag;
                window.gtag('js', new Date());
                window.gtag('config', GA4);
                window.__analyticsLoaded = true;
            }
        } catch (e) {
            try { console.warn('ensureAnalyticsLoaded failed:', e); } catch (_) {}
        }
    }

    // === BOOKING CTA TRACKING & PREFILL PARAM APPENDER ===
    function initBookingCtaTracking() {
        try {
            document.addEventListener('click', function(e) {
                const anchor = e.target && e.target.closest && e.target.closest('a');
                if (!anchor) return;

                const rawHref = anchor.getAttribute('href') || '';
                if (!rawHref) return;

                const isBookingLink =
                    rawHref.endsWith('booking/index.html') ||
                    rawHref.includes('/booking/index.html') ||
                    rawHref.includes('../booking/index.html') ||
                    rawHref.includes('./booking/index.html');
                if (!isBookingLink) return;

                const ctx = (function getPackageContext() {
                    const withData = e.target.closest('[data-package-title], [data-amount], [data-package-id]');
                    const dataTitle = withData && withData.getAttribute('data-package-title');
                    const dataAmount = withData && withData.getAttribute('data-amount');
                    const dataPkgId = withData && withData.getAttribute('data-package-id');

                    const h1 = (document.querySelector('h1') || {});
                    const h1Text = (h1.textContent || '').trim();
                    const og = document.querySelector('meta[property="og:title"]');
                    const ogTitle = og && og.getAttribute('content') ? og.getAttribute('content').trim() : '';
                    const docTitle = (document.title || '').trim();

                    const priceEl = document.querySelector('[data-price], .price, .package-price');
                    const priceText = (dataAmount || (priceEl && (priceEl.getAttribute('data-price') || priceEl.textContent)) || '').trim();
                    const numMatch = (priceText.match(/[\d,]+(?:\.\d+)?/) || [null])[0];
                    const amount = numMatch ? numMatch.replace(/,/g, '') : '';

                    const path = (window.location && window.location.pathname) || '';
                    const file = path.split('/').pop() || '';
                    const pkgIdFromPath = file.replace(/\.html?$/i, '');

                    return {
                        title: (dataTitle || h1Text || ogTitle || docTitle || '').substring(0, 120),
                        amount: amount,
                        packageId: (dataPkgId || pkgIdFromPath || '').substring(0, 80)
                    };
                })();

                try {
                    const absolute = new URL(anchor.href, window.location.origin);
                    if (ctx.title) absolute.searchParams.set('title', ctx.title);
                    if (ctx.amount) absolute.searchParams.set('amount', ctx.amount);
                    if (ctx.packageId) absolute.searchParams.set('packageId', ctx.packageId);
                    anchor.href = absolute.toString();
                } catch (urlErr) {
                    try { console.warn('Booking CTA URL build failed:', urlErr); } catch (_) {}
                }

                try {
                    const payload = {
                        event: 'booking_cta_click',
                        package_title: ctx.title || undefined,
                        amount: ctx.amount || undefined,
                        package_id: ctx.packageId || undefined,
                        page_path: (window.location && window.location.pathname) || undefined,
                        ts: Date.now()
                    };

                    if (typeof window.gtag === 'function') {
                        window.gtag('event', 'booking_cta_click', payload);
                    } else if (Array.isArray(window.dataLayer)) {
                        window.dataLayer.push(payload);
                    } else {
                        try { console.log('[Analytics]', payload); } catch (_) {}
                    }
                } catch (trackErr) {
                    try { console.warn('Analytics dispatch failed:', trackErr); } catch (_) {}
                }
            }, true);
        } catch (e) {
            console.warn('initBookingCtaTracking failed:', e);
        }
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

    // === PRETTY URLS (hide .html in address bar) ===
    function initPrettyUrls() {
        try {
            const loc = window.location;
            const path = (loc && loc.pathname) || '';

            // Helper: is internal same-origin link
            function isInternal(href) {
                try {
                    const u = new URL(href, loc.href);
                    return u.origin === loc.origin;
                } catch (_) { return false; }
            }

            // 1) If current URL ends with .html, hide it (visual only)
            if (path && /\.html?$/i.test(path)) {
                const clean = path.replace(/\.html?$/i, '');
                try {
                    const url = new URL(loc.href);
                    url.pathname = clean;
                    window.history.replaceState({}, document.title, url.toString());
                } catch (_) {}
            }

            // 2) Rewrite internal anchors to pretty URLs
            const anchors = document.querySelectorAll('a[href]');
            anchors.forEach((a) => {
                const href = a.getAttribute('href');
                if (!href || href.startsWith('javascript:')) return;
                if (!isInternal(href)) return;
                // Skip hash-only and query-only links
                if (href.startsWith('#') || href.startsWith('?')) return;
                try {
                    const u = new URL(href, loc.href);
                    // Only rewrite if it ends with .html
                    if (/\.html?$/i.test(u.pathname)) {
                        u.pathname = u.pathname.replace(/\.html?$/i, '');
                        a.setAttribute('href', u.pathname + u.search + u.hash);
                    }
                } catch (_) {}
            });

            // 3) Intercept clicks to ensure clean navigation (no .html)
            document.addEventListener('click', (e) => {
                try {
                    const a = e.target && (e.target.closest ? e.target.closest('a[href]') : null);
                    if (!a) return;
                    // Respect modified clicks/new tabs
                    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
                    const href = a.getAttribute('href');
                    if (!href) return;
                    if (!isInternal(href)) return;
                    if (href.startsWith('#') || href.startsWith('?')) return;
                    const u = new URL(href, loc.href);
                    // Only handle same-page or same-origin navigations
                    let destPath = u.pathname;
                    // Normalize to clean URL
                    if (/\.html?$/i.test(destPath)) destPath = destPath.replace(/\.html?$/i, '');
                    const pretty = destPath + u.search + u.hash;
                    // If link already points to pretty path, allow default
                    if (a.getAttribute('href') === pretty) return;
                    // Perform clean navigation: push clean, then navigate to clean URL
                    e.preventDefault();
                    try { window.history.pushState({}, document.title, pretty); } catch (_) {}
                    // Trigger actual navigation to clean URL (server/404 router will resolve)
                    window.location.href = pretty;
                } catch (_) { /* noop */ }
            }, true);
        } catch (e) {
            try { console.warn('initPrettyUrls failed:', e); } catch (_) {}
        }
    }

    // === POLICY FOOTER LINKS NORMALIZER ===
    function initPolicyFooterLinks() {
        try {
            const pathname = (window.location && window.location.pathname) || '';
            // Compute depth-based prefix to reach site root.
            // On GitHub Pages project sites, paths are like /<repo-name>/page.html.
            // We should ignore the repo folder when computing depth so that
            // /<repo>/index.html gets './' (not '../').
            let parts = pathname.split('/').filter(Boolean); // e.g., ['gisu-safaris','packages','tanzania.html']
            const isGhPages = /\.github\.io$/i.test(window.location && window.location.hostname || '');
            if (isGhPages && parts.length > 0) {
                // Treat first segment as repo base for project sites
                parts = parts.slice(1);
            }
            const depth = Math.max(0, parts.length - 1);
            const prefix = depth > 0 ? Array(depth).fill('..').join('/') + '/' : './';

            const footer = document.querySelector('footer');
            const anchors = footer ? footer.querySelectorAll('a') : [];
            let foundPrivacy = false;
            let foundTerms = false;
            anchors.forEach(a => {
                const label = (a.textContent || '').trim().toLowerCase();
                if (label === 'privacy policy') {
                    const target = prefix + 'privacy.html';
                    if (a.getAttribute('href') !== target) a.setAttribute('href', target);
                    foundPrivacy = true;
                } else if (label === 'terms of service' || label === 'terms & conditions' || label === 'terms and conditions' || label === 'terms') {
                    const target = prefix + 'terms.html';
                    if (a.getAttribute('href') !== target) a.setAttribute('href', target);
                    foundTerms = true;
                }
            });

            // If footer exists but links are missing, inject a compact link row at the end
            if (footer && (!foundPrivacy || !foundTerms)) {
                // Find a suitable container in footer
                const container = footer.querySelector('.container') || footer;
                const linkWrap = document.createElement('div');
                linkWrap.className = 'mt-2 text-md-end';
                // Build links, reusing prefix
                const privacyA = document.createElement('a');
                privacyA.href = prefix + 'privacy.html';
                privacyA.className = 'text-white-50 text-decoration-none me-3';
                privacyA.textContent = 'Privacy Policy';
                const termsA = document.createElement('a');
                termsA.href = prefix + 'terms.html';
                termsA.className = 'text-white-50 text-decoration-none';
                termsA.textContent = 'Terms of Service';

                if (!foundPrivacy) linkWrap.appendChild(privacyA);
                if (!foundTerms) {
                    if (!foundPrivacy) {
                        // add a small space handled by classes; nothing else needed
                    }
                    linkWrap.appendChild(termsA);
                }

                // Append only if at least one was missing
                if (linkWrap.childNodes.length) {
                    container.appendChild(linkWrap);
                }
            }
        } catch (e) {
            try { console.warn('initPolicyFooterLinks failed:', e); } catch (_) {}
        }
    }

    // === SAFE STUBS FOR OPTIONAL FEATURES ===
    function showNotification(message, type = 'info') {
        try { console.log(`[Notify:${type}]`, message); } catch (_) {}
    }

    // === HERO TEXT ROTATOR ===
    function initHeroTextRotator() {
        try {
            const el = document.querySelector('.hero-rotating .word');
            if (!el) return;

            const words = ['our story','our mission','our vision','our values','our team'];
            let idx = 0;
            el.classList.add('in');

            const cycle = () => {
                el.classList.remove('in');
                el.classList.add('out');
                setTimeout(() => {
                    idx = (idx + 1) % words.length;
                    el.textContent = words[idx];
                    el.classList.remove('out');
                    el.classList.add('in');
                }, 200);
            };

            setInterval(cycle, 2000);
        } catch (e) {
            console.warn('initHeroTextRotator failed:', e);
        }
    }

    // === CARD IMAGE ROTATORS (Vehicle fleet, generic use) ===
    function initCardImageRotators() {
        try {
            const rotators = document.querySelectorAll('.image-rotator');
            if (!rotators.length) return;

            // Intersection observer to start/stop when visible
            const io = ('IntersectionObserver' in window)
                ? new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        const el = entry.target;
                        const ctl = el.__rotatorCtl;
                        if (!ctl) return;
                        if (entry.isIntersecting) ctl.start(); else ctl.stop();
                    });
                }, { threshold: 0.1 })
                : null;

            rotators.forEach((rot) => {
                const imgs = Array.from(rot.querySelectorAll('img'));
                if (imgs.length < 2) return; // need at least 2 to rotate

                // Initial styles for crossfade
                imgs.forEach((img, i) => {
                    if (i === 0) {
                        img.style.opacity = '1';
                        img.style.position = img.style.position || 'relative';
                        img.style.zIndex = '1';
                    } else {
                        img.style.opacity = '0';
                        img.style.position = 'absolute';
                        img.style.top = '0';
                        img.style.left = '0';
                        img.style.width = '100%';
                    }
                });

                let idx = 0;
                let timer = null;
                let playing = false;

                // Force rotation every 2s regardless of reduced-motion for these rotators
                const step = () => {
                    const next = (idx + 1) % imgs.length;
                    imgs[idx].style.opacity = '0';
                    imgs[next].style.opacity = '1';
                    idx = next;
                };

                const start = () => {
                    if (playing) return;
                    playing = true;
                    timer = setInterval(step, 2000);
                };

                const stop = () => {
                    playing = false;
                    if (timer) { clearInterval(timer); timer = null; }
                };

                // Pause/Resume on hover
                rot.addEventListener('mouseenter', stop);
                rot.addEventListener('mouseleave', start);

                // Visibility-aware start/stop
                if (io) {
                    rot.__rotatorCtl = { start, stop };
                    io.observe(rot);
                } else {
                    start();
                }
            });
        } catch (e) {
            console.warn('initCardImageRotators failed:', e);
        }
    }

    // === INITIALIZATION ===
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        try {
            if (typeof ensureFontAwesome === 'function') ensureFontAwesome();
            if (typeof initWhatsAppButton === 'function') initWhatsAppButton();
            if (typeof ensureWhatsAppWidget === 'function') ensureWhatsAppWidget();
            if (typeof initHeroSlider === 'function') initHeroSlider();
            if (typeof initStorySlider === 'function') initStorySlider();
            if (typeof initScrollAnimations === 'function') initScrollAnimations();
            if (typeof ensureAISafariBotLoaded === 'function') ensureAISafariBotLoaded();
            if (typeof initAccessibility === 'function') initAccessibility();
            if (typeof initSafariFeatures === 'function') initSafariFeatures();
            if (typeof initCardImageRotators === 'function') initCardImageRotators();
            if (typeof initViewAllPackagesButton === 'function') initViewAllPackagesButton();
            if (typeof initBookingCtaTracking === 'function') initBookingCtaTracking();
            if (typeof initPolicyFooterLinks === 'function') initPolicyFooterLinks();
            if (typeof normalizeWhatsAppNumbers === 'function') normalizeWhatsAppNumbers();
            if (typeof initPrettyUrls === 'function') initPrettyUrls();
            if (typeof initIncludedVideoControls === 'function') initIncludedVideoControls();
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

        // Robust open with preference for inline chat; only use wa.me if widget is missing after injection
        if (openBtn) openBtn.addEventListener('click', (e) => {
            try {
                e.preventDefault();
            } catch (_) {}
            const hasWidgetMarkup = !!document.querySelector('.whatsapp-widget');
            if (!hasWidgetMarkup) {
                // Try to inject the widget first
                try { if (typeof ensureWhatsAppWidget === 'function') ensureWhatsAppWidget(); } catch(_) {}
            }
            // Attempt to open inline chat after injection
            setTimeout(() => {
                const widget = chatWidget();
                if (widget) {
                    if (!widget.classList.contains('active')) {
                        toggleWhatsAppChatInternal();
                    }
                    return; // Do not open wa.me if we have inline chat
                }
                // As a last resort (widget missing), open wa.me
                const fallbackMsg = encodeURIComponent('Hello! I would like to plan a safari.');
                const url = `https://wa.me/${phoneNumber}?text=${fallbackMsg}`;
                window.open(url, '_blank');
            }, 180);
        });
        if (closeBtn) closeBtn.addEventListener('click', () => toggleWhatsAppChatInternal());
        if (sendBtn) sendBtn.addEventListener('click', () => sendWhatsAppMessageInternal());
        if (input) input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendWhatsAppMessageInternal();
            }
        });

        // Capture-phase safety net to ensure close works even if an overlay intercepts bubbling
        // This does not interfere with inline onclick or other handlers
        try {
            document.addEventListener('click', function(e) {
                const isClose = e.target && e.target.closest && e.target.closest('.whatsapp-close-btn');
                if (isClose) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWhatsAppChatInternal();
                }
            }, true); // capture phase
        } catch (_) { /* no-op */ }

        // Delegated fallbacks to ensure clicks work even if dynamic timing changes
        if (!window.__whatsappDelegated) {
            window.__whatsappDelegated = true;
            document.addEventListener('click', (e) => {
                const open = e.target && e.target.closest && e.target.closest('.whatsapp-btn');
                const close = e.target && e.target.closest && e.target.closest('.whatsapp-close-btn');
                const send = e.target && e.target.closest && e.target.closest('.whatsapp-send-btn');
                if (open) { 
                    try { e.preventDefault(); } catch (_) {}
                    const hasWidgetMarkup = !!document.querySelector('.whatsapp-widget');
                    if (!hasWidgetMarkup) {
                        try { if (typeof ensureWhatsAppWidget === 'function') ensureWhatsAppWidget(); } catch(_) {}
                    }
                    setTimeout(() => {
                        const widget = chatWidget();
                        if (widget) {
                            if (!widget.classList.contains('active')) {
                                toggleWhatsAppChatInternal();
                            }
                            return; // inline chat available; do not open wa.me
                        }
                        const fallbackMsg = encodeURIComponent('Hello! I would like to plan a safari.');
                        const url = `https://wa.me/${phoneNumber}?text=${fallbackMsg}`;
                        window.open(url, '_blank');
                    }, 180);
                }
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
                            <p><i class="fa-solid fa-phone me-1" aria-hidden="true"></i> Hello! Welcome to Gisu Safaris!</p>
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
            const ver = 'v=20250818-3';
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

        // Defensive fallback: if fade-in animations didn't trigger, reveal content
        // This addresses cases where IntersectionObserver fails or scripts are blocked,
        // ensuring that .fade-element sections (e.g., on contact.html) are visible.
        setTimeout(() => {
            try {
                const hidden = document.querySelectorAll('.fade-element:not(.fade-in)');
                if (hidden && hidden.length) {
                    hidden.forEach(el => el.classList.add('fade-in'));
                }
            } catch (_) { /* noop */ }
        }, 1200);

        // Safety: re-inject AI bot if it failed to appear after load
        try {
            const reinjectIfMissing = () => {
                try {
                    const hasWidget = !!document.getElementById('ai-safari-bot');
                    if (!hasWidget && typeof ensureAISafariBotLoaded === 'function') {
                        console.warn('[AI Bot] widget missing post-load; attempting reinjection');
                        ensureAISafariBotLoaded();
                    }
                } catch (e) {
                    try { console.warn('AI Bot safety check failed:', e); } catch (_) {}
                }
            };
            setTimeout(reinjectIfMissing, 800);
            setTimeout(reinjectIfMissing, 3000);
        } catch (e) {
            try { console.warn('AI Bot post-load safety hook failed:', e); } catch (_) {}
        }
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
            initStorySlider && initStorySlider();
            initHeroTextRotator && initHeroTextRotator();
            initSmoothScroll && initSmoothScroll();
            initScrollAnimations && initScrollAnimations();
            initLazyLoading && initLazyLoading();
            ensureFontAwesome && ensureFontAwesome();
            initWhatsAppButton && initWhatsAppButton();
            ensureWhatsAppWidget && ensureWhatsAppWidget();
            ensureAISafariBotLoaded && ensureAISafariBotLoaded();
            initAccessibility && initAccessibility();
            initSafariFeatures && initSafariFeatures();
            initCardImageRotators && initCardImageRotators();
            initBookingCtaTracking && initBookingCtaTracking();
            initIncludedVideoControls && initIncludedVideoControls();
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
