// AI-Powered Dynamic Pricing and Personalization Engine
class SafariPersonalizationAI {
    constructor() {
        this.userProfile = {
            location: null,
            visitHistory: [],
            interests: [],
            budgetRange: null,
            timeOnSite: 0,
            pageViews: 0,
            scrollDepth: 0,
            deviceType: this.detectDevice(),
            referralSource: document.referrer || 'direct',
            sessionStart: Date.now()
        };
        
        this.pricingRules = {
            'US': { multiplier: 1.0, currency: 'USD', flag: '🇺🇸' },
            'UK': { multiplier: 0.85, currency: 'GBP', flag: '🇬🇧' },
            'CA': { multiplier: 1.35, currency: 'CAD', flag: '🇨🇦' },
            'AU': { multiplier: 1.45, currency: 'AUD', flag: '🇦🇺' },
            'DE': { multiplier: 0.92, currency: 'EUR', flag: '🇩🇪' },
            'default': { multiplier: 1.0, currency: 'USD', flag: '🌍' }
        };
        
        this.urgencyTriggers = [
            "⚡ Limited Time: Book within 24 hours and save 10%",
            "🔥 Only 3 spots left for this package this month",
            "⏰ Flash Sale: Early Bird Special ends in 6 hours",
            "🎯 Exclusive: First-time visitor 15% discount",
            "💎 VIP Pricing: Unlock member rates now"
        ];
        
        this.init();
    }

    init() {
        this.detectUserLocation();
        this.trackUserBehavior();
        this.personalizeContent();
        this.initDynamicPricing();
        this.addPersonalizationStyles();
    }

    detectDevice() {
        const width = window.innerWidth;
        if (width < 768) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    }

    async detectUserLocation() {
        try {
            // Try IP-based geolocation first
            const response = await fetch('https://ipapi.co/json/');
            const data = await response.json();
            
            this.userProfile.location = {
                country: data.country_code,
                countryName: data.country_name,
                city: data.city,
                timezone: data.timezone
            };
            
            this.updatePricingForLocation();
            this.showLocationBasedOffers();
        } catch (error) {
            // Fallback to browser geolocation
            this.fallbackLocationDetection();
        }
    }

    fallbackLocationDetection() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                // Use a reverse geocoding service or estimate based on timezone
                this.userProfile.location = {
                    country: 'US', // Default fallback
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                this.updatePricingForLocation();
            });
        }
    }

    updatePricingForLocation() {
        const country = this.userProfile.location?.country || 'default';
        const pricing = this.pricingRules[country] || this.pricingRules['default'];
        
        // Update all price elements on the page
        document.querySelectorAll('.price-range, .package-rec-price, .display-price').forEach(element => {
            const originalPrice = element.dataset.basePrice || this.extractPrice(element.textContent);
            if (originalPrice) {
                const localizedPrice = Math.round(originalPrice * pricing.multiplier);
                const formattedPrice = this.formatPrice(localizedPrice, pricing.currency);
                
                element.innerHTML = element.innerHTML.replace(/\$[\d,]+/, formattedPrice);
                element.setAttribute('data-currency', pricing.currency);
                element.setAttribute('data-country', country);
            }
        });

        // Add currency indicator
        this.addCurrencyIndicator(pricing);
    }

    extractPrice(text) {
        const match = text.match(/\$?([\d,]+)/);
        return match ? parseInt(match[1].replace(',', '')) : null;
    }

    formatPrice(amount, currency) {
        const currencySymbols = {
            'USD': '$',
            'GBP': '£',
            'EUR': '€',
            'CAD': 'C$',
            'AUD': 'A$'
        };
        
        const symbol = currencySymbols[currency] || '$';
        return `${symbol}${amount.toLocaleString()}`;
    }

    addCurrencyIndicator(pricing) {
        if (!document.getElementById('currency-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'currency-indicator';
            indicator.innerHTML = `
                <div class="currency-badge">
                    <span>${pricing.flag}</span>
                    <span>${pricing.currency}</span>
                </div>
            `;
            document.body.appendChild(indicator);
        }
    }

    trackUserBehavior() {
        // Track time on site
        setInterval(() => {
            this.userProfile.timeOnSite += 1;
            this.checkEngagementTriggers();
        }, 1000);

        // Track scroll depth
        window.addEventListener('scroll', this.throttle(() => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            this.userProfile.scrollDepth = Math.max(this.userProfile.scrollDepth, scrollPercent);
            
            if (scrollPercent > 50 && !this.userProfile.engagementTriggered) {
                this.triggerEngagementPopup();
                this.userProfile.engagementTriggered = true;
            }
        }, 500));

        // Track page views
        this.userProfile.pageViews++;

        // Track clicks on safari packages
        document.querySelectorAll('.package-card, .overview-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const packageName = card.querySelector('h3, h4')?.textContent || 'Unknown';
                this.userProfile.interests.push(packageName);
                this.trackEvent('package_interest', packageName);
            });
        });
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    checkEngagementTriggers() {
        // Show urgency message after 30 seconds
        if (this.userProfile.timeOnSite === 30 && !this.userProfile.urgencyShown) {
            this.showUrgencyMessage();
            this.userProfile.urgencyShown = true;
        }

        // Show exit intent popup after 2 minutes of engagement
        if (this.userProfile.timeOnSite === 120 && !this.userProfile.exitIntentReady) {
            this.setupExitIntent();
            this.userProfile.exitIntentReady = true;
        }
    }

    showUrgencyMessage() {
        const urgencyMsg = this.urgencyTriggers[Math.floor(Math.random() * this.urgencyTriggers.length)];
        this.showNotification(urgencyMsg, 'urgency');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `ai-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 10000);
    }

    setupExitIntent() {
        document.addEventListener('mouseleave', (e) => {
            if (e.clientY <= 0 && !this.userProfile.exitPopupShown) {
                this.showExitIntentPopup();
                this.userProfile.exitPopupShown = true;
            }
        });
    }

    showExitIntentPopup() {
        const popup = document.createElement('div');
        popup.id = 'exit-intent-popup';
        popup.innerHTML = `
            <div class="exit-popup-overlay">
                <div class="exit-popup-content">
                    <button class="exit-popup-close" onclick="document.getElementById('exit-intent-popup').remove()">×</button>
                    <div class="exit-popup-header">
                        <h3>🎯 Wait! Don't Miss Out!</h3>
                        <p>Get a FREE Safari Planning Guide + 10% Off Your First Booking</p>
                    </div>
                    <div class="exit-popup-form">
                        <input type="email" placeholder="Enter your email for instant access" id="exit-email">
                        <button onclick="personalizationAI.handleExitOffer()" class="exit-popup-btn">
                            Get My Free Guide + Discount
                        </button>
                    </div>
                    <div class="exit-popup-benefits">
                        <div class="benefit">📚 50-page Safari Planning Guide</div>
                        <div class="benefit">💰 10% Discount on Any Package</div>
                        <div class="benefit">📞 FREE 15-min Consultation Call</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        this.trackEvent('exit_intent_shown', 'popup');
    }

    handleExitOffer() {
        const email = document.getElementById('exit-email').value;
        if (email && this.isValidEmail(email)) {
            // Here you would typically send to your email marketing system
            this.trackEvent('lead_captured', email);
            
            // Show success message
            document.querySelector('.exit-popup-content').innerHTML = `
                <div class="success-message">
                    <h3>🎉 Success! Check Your Email</h3>
                    <p>Your Safari Guide is on its way!</p>
                    <p>Plus, your 10% discount code: <strong>SAFARI10</strong></p>
                    <button onclick="document.getElementById('exit-intent-popup').remove()" class="exit-popup-btn">
                        Continue Exploring
                    </button>
                </div>
            `;
            
            // Auto-close after 5 seconds
            setTimeout(() => {
                const popup = document.getElementById('exit-intent-popup');
                if (popup) popup.remove();
            }, 5000);
        } else {
            alert('Please enter a valid email address');
        }
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    triggerEngagementPopup() {
        if (this.userProfile.deviceType === 'mobile') {
            // Mobile-friendly engagement
            this.showNotification("👋 Planning your safari? Get instant answers with our AI assistant!", 'engagement');
        } else {
            // Desktop engagement popup
            this.showSmartRecommendations();
        }
    }

    showSmartRecommendations() {
        const recommendations = this.generateSmartRecommendations();
        
        const popup = document.createElement('div');
        popup.className = 'smart-recommendations-popup';
        popup.innerHTML = `
            <div class="smart-rec-content">
                <div class="smart-rec-header">
                    <h4>🤖 AI Recommendations Just For You</h4>
                    <button onclick="this.parentElement.parentElement.remove()" class="smart-rec-close">×</button>
                </div>
                <div class="smart-rec-body">
                    <p>Based on your browsing, these packages might interest you:</p>
                    ${recommendations.map(rec => `
                        <div class="smart-rec-item">
                            <strong>${rec.name}</strong> - ${rec.reason}
                            <a href="${rec.url}" class="smart-rec-link">View Details</a>
                        </div>
                    `).join('')}
                </div>
                <div class="smart-rec-footer">
                    <button onclick="safariBot.toggleBot()" class="smart-rec-btn">
                        Get Personalized Recommendations
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.classList.add('show');
        }, 100);
    }

    generateSmartRecommendations() {
        const recommendations = [
            {
                name: "Uganda Gorilla Trekking",
                reason: "Perfect for first-time African safari",
                url: "packages/uganda-gorilla-trekking.html"
            },
            {
                name: "Kenya Big Five Safari", 
                reason: "Most popular among international visitors",
                url: "packages/kenya-masai-mara-big-five.html"
            },
            {
                name: "Tanzania Great Migration",
                reason: "Best value for wildlife photography",
                url: "packages/tanzania-serengeti.html"
            }
        ];

        // Personalize based on user behavior
        if (this.userProfile.timeOnSite > 60) {
            recommendations[0].reason = "You seem really interested - great choice for beginners!";
        }

        if (this.userProfile.scrollDepth > 75) {
            recommendations[1].reason = "You've explored a lot - this comprehensive package is perfect!";
        }

        return recommendations.slice(0, 2); // Show top 2
    }

    personalizeContent() {
        // Personalize headlines based on location
        if (this.userProfile.location?.country) {
            const headlines = document.querySelectorAll('.hero-title, h1');
            headlines.forEach(headline => {
                if (headline.textContent.includes('Best Africa Safari Packages')) {
                    const countryName = this.userProfile.location.countryName;
                    headline.innerHTML = headline.innerHTML.replace(
                        'Best Africa Safari Packages',
                        `Best Africa Safari Packages for ${countryName} Travelers`
                    );
                }
            });
        }

        // Add social proof based on location
        this.addLocationBasedSocialProof();
    }

    addLocationBasedSocialProof() {
        const socialProofMessages = {
            'US': "Join 200+ American travelers who've discovered East Africa with us!",
            'UK': "Trusted by 150+ British adventurers since 2020!",
            'CA': "85+ Canadian families have experienced our safaris!",
            'AU': "75+ Australian travelers rate us 5-stars!",
            'default': "487+ international travelers trust us for their African adventure!"
        };

        const country = this.userProfile.location?.country || 'default';
        const message = socialProofMessages[country] || socialProofMessages['default'];

        // Add to hero section
        const heroStats = document.querySelector('.hero-stats');
        if (heroStats) {
            const socialProof = document.createElement('div');
            socialProof.className = 'col-12 social-proof-message';
            socialProof.innerHTML = `<p class="text-warning fw-bold">${message}</p>`;
            heroStats.appendChild(socialProof);
        }
    }

    showLocationBasedOffers() {
        if (!this.userProfile.location) return;

        const offers = {
            'US': {
                message: "🇺🇸 Special for US Travelers: Free airport transfers + Travel insurance included!",
                discount: "USA15"
            },
            'UK': {
                message: "🇬🇧 UK Exclusive: Direct flights coordination + UK travel standards guarantee!",
                discount: "BRIT20"
            },
            'CA': {
                message: "🇨🇦 Canadian Special: Currency protection + Maple leaf hospitality!",
                discount: "CANADA15"
            },
            'AU': {
                message: "🇦🇺 Aussie Deal: Long-haul comfort package + Aussie guide connections!",
                discount: "AUSSIE10"
            }
        };

        const offer = offers[this.userProfile.location.country];
        if (offer) {
            setTimeout(() => {
                this.showNotification(offer.message + ` Use code: ${offer.discount}`, 'location-offer');
            }, 5000);
        }
    }

    trackEvent(action, label, value) {
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': 'AI_Personalization',
                'event_label': label,
                'value': value
            });
        }

        // Custom tracking
        console.log(`Personalization Event: ${action} - ${label} - ${value}`);
        
        // You can send to your own analytics endpoint
        // fetch('/api/analytics', { method: 'POST', body: JSON.stringify({action, label, value}) });
    }

    addPersonalizationStyles() {
        const styles = document.createElement('style');
        styles.innerHTML = `
            /* AI Personalization Styles */
            #currency-indicator {
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 999;
            }

            .currency-badge {
                background: linear-gradient(135deg, #2E7D32, #4CAF50);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }

            .ai-notification {
                position: fixed;
                top: 100px;
                right: -400px;
                width: 350px;
                background: white;
                border-radius: 10px;
                box-shadow: 0 5px 25px rgba(0,0,0,0.2);
                z-index: 1001;
                transition: right 0.3s ease;
            }

            .ai-notification.show {
                right: 20px;
            }

            .ai-notification.urgency {
                border-left: 4px solid #FF6B35;
            }

            .ai-notification.engagement {
                border-left: 4px solid #2E7D32;
            }

            .ai-notification.location-offer {
                border-left: 4px solid #FFD700;
                background: linear-gradient(135deg, #FFF8E1, #FFFFFF);
            }

            .notification-content {
                padding: 15px;
                display: flex;
                align-items: center;
                justify-content: between;
            }

            .notification-message {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                color: #999;
                cursor: pointer;
                margin-left: 10px;
            }

            #exit-intent-popup {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 2000;
                animation: fadeIn 0.3s ease;
            }

            .exit-popup-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .exit-popup-content {
                background: white;
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                max-height: 80%;
                overflow-y: auto;
                position: relative;
                animation: slideInDown 0.3s ease;
            }

            @keyframes slideInDown {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .exit-popup-close {
                position: absolute;
                top: 15px;
                right: 20px;
                background: none;
                border: none;
                font-size: 24px;
                color: #999;
                cursor: pointer;
            }

            .exit-popup-header h3 {
                color: #2E7D32;
                margin-bottom: 10px;
                font-size: 24px;
            }

            .exit-popup-header p {
                color: #666;
                font-size: 16px;
                margin-bottom: 20px;
            }

            .exit-popup-form {
                margin: 20px 0;
            }

            #exit-email {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
                margin-bottom: 15px;
            }

            #exit-email:focus {
                outline: none;
                border-color: #2E7D32;
            }

            .exit-popup-btn {
                width: 100%;
                background: linear-gradient(135deg, #FF6B35, #F7931E);
                color: white;
                border: none;
                padding: 15px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .exit-popup-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(255, 107, 53, 0.3);
            }

            .exit-popup-benefits {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }

            .benefit {
                padding: 8px 0;
                color: #333;
                font-size: 14px;
            }

            .success-message {
                text-align: center;
                color: #2E7D32;
            }

            .success-message h3 {
                color: #2E7D32;
                margin-bottom: 15px;
            }

            .success-message strong {
                background: #FFD700;
                padding: 3px 8px;
                border-radius: 4px;
                color: #333;
            }

            .smart-recommendations-popup {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 350px;
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                z-index: 1000;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
            }

            .smart-recommendations-popup.show {
                opacity: 1;
                transform: translateY(0);
            }

            .smart-rec-header {
                background: linear-gradient(135deg, #2E7D32, #4CAF50);
                color: white;
                padding: 15px;
                border-radius: 15px 15px 0 0;
                display: flex;
                justify-content: between;
                align-items: center;
            }

            .smart-rec-header h4 {
                margin: 0;
                font-size: 16px;
            }

            .smart-rec-close {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
            }

            .smart-rec-body {
                padding: 15px;
            }

            .smart-rec-item {
                padding: 10px 0;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: between;
                align-items: center;
            }

            .smart-rec-item:last-child {
                border-bottom: none;
            }

            .smart-rec-link {
                background: #FF6B35;
                color: white;
                text-decoration: none;
                padding: 5px 10px;
                border-radius: 15px;
                font-size: 12px;
                transition: all 0.2s ease;
            }

            .smart-rec-link:hover {
                background: #E55A2D;
                color: white;
            }

            .smart-rec-footer {
                padding: 15px;
                border-top: 1px solid #eee;
            }

            .smart-rec-btn {
                width: 100%;
                background: linear-gradient(135deg, #2E7D32, #4CAF50);
                color: white;
                border: none;
                padding: 12px;
                border-radius: 8px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .smart-rec-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 3px 10px rgba(46, 125, 50, 0.3);
            }

            .social-proof-message {
                margin-top: 20px;
                text-align: center;
            }

            /* Mobile Responsive */
            @media (max-width: 768px) {
                .ai-notification {
                    width: 300px;
                    right: -320px;
                }

                .ai-notification.show {
                    right: 10px;
                }

                .exit-popup-content {
                    padding: 20px;
                    margin: 20px;
                }

                .smart-recommendations-popup {
                    width: 320px;
                    left: 10px;
                    bottom: 10px;
                }

                #currency-indicator {
                    top: 70px;
                    right: 10px;
                }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Initialize the Personalization AI
const personalizationAI = new SafariPersonalizationAI();
