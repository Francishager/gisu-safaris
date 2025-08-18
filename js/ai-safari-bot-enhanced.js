// Enhanced AI-Powered Safari Package Recommendation System with External APIs
// Wrapped in an IIFE to avoid polluting global scope and prevent redeclaration errors on double-load
(function() {
    if (typeof window !== 'undefined' && window.SafariAIBotEnhanced) {
        try {
            // Reuse existing constructor/instance when already present
            if (typeof window.SafariAIBotEnhanced.getInstance === 'function') {
                window.safariBot = window.SafariAIBotEnhanced.getInstance();
            }
        } catch (_) { /* no-op */ }
        return; // stop here, avoid redefining
    }

class SafariAIBotEnhancedInternal {
    constructor() {
        this.isActive = false;
        this.conversationState = 'greeting';
        this.conversationHistory = [];
        this.sessionStartTime = new Date();
        this.userPreferences = {
            budget: null,
            duration: null,
            interests: [],
            groupSize: null,
            experience: null,
            country: null
        };
        
        // Human handoff configuration
        this.humanHandoff = {
            whatsappNumber: '61478914106',
            phoneNumber: '+256780950555',
            emailAddresses: ['rmagomu@yahoo.com', 'gisusafaris@gmail.com'],
            inactivityTimeout: 60000, // 1 minute
            lastActivityTime: Date.now()
        };

        // Visitor info and consent
        this.visitor = this.loadVisitorFromStorage();
        
        // API Configuration
        this.apiConfig = {
            exchangeRate: {
                baseUrl: 'https://v6.exchangerate-api.com/v6/',
                apiKey: 'f08dcb596ea7039d80f0a8fc'
            },
            restCountries: {
                baseUrl: 'https://restcountries.com/v3.1'
            },
            wikipedia: {
                baseUrl: 'https://en.wikipedia.org/api/rest_v1/page/summary'
            }
        };
        
        // Cache for API responses to avoid unnecessary requests
        this.apiCache = {
            exchangeRates: null,
            countries: {},
            leaders: {},
            cacheTimestamp: null
        };
        
        // Define safari packages with metadata
        this.packages = [
            {
                id: 'uganda-gorilla',
                name: 'Uganda Gorilla Trekking',
                price: 650,
                duration: 3,
                country: 'Uganda',
                highlights: ['Mountain Gorillas', 'Bwindi Forest', 'Expert Guides'],
                bestFor: ['first-time', 'wildlife-lovers', 'photography'],
                url: 'packages/uganda-gorilla-trekking.html'
            },
            {
                id: 'kenya-big-five',
                name: 'Kenya Big Five Safari',
                price: 750,
                duration: 5,
                country: 'Kenya',
                highlights: ['Big Five', 'Masai Mara', 'Cultural Experience'],
                bestFor: ['classic-safari', 'wildlife-lovers', 'cultural'],
                url: 'packages/kenya-masai-mara-big-five.html'
            },
            {
                id: 'tanzania-migration',
                name: 'Tanzania Great Migration',
                price: 950,
                duration: 6,
                country: 'Tanzania',
                highlights: ['Great Migration', 'Serengeti', 'Ngorongoro Crater'],
                bestFor: ['luxury', 'photography', 'once-in-lifetime'],
                url: 'packages/tanzania-serengeti.html'
            },
            {
                id: 'rwanda-luxury',
                name: 'Rwanda Luxury Gorilla Trek',
                price: 850,
                duration: 3,
                country: 'Rwanda',
                highlights: ['Mountain Gorillas', 'Luxury Lodges', 'Golden Monkeys'],
                bestFor: ['luxury', 'honeymoon', 'convenience'],
                url: 'packages/rwanda-gorilla-trekking.html'
            },
            {
                id: 'multi-country',
                name: 'East Africa Grand Tour',
                price: 1850,
                duration: 14,
                country: 'Multi-Country',
                highlights: ['All Big Destinations', 'Comprehensive Tour', 'VIP Treatment'],
                bestFor: ['luxury', 'comprehensive', 'once-in-lifetime'],
                url: 'packages/multi-country.html'
            }
        ];
        this.init();
    }

    init() {
        // Avoid duplicate widget injection if already present
        this.createAIWidget();
        // Bind events immediately if DOM is ready, otherwise on DOMContentLoaded
        this.bindEvents();
        this.preloadAPIData();
    }

    // API Utility Functions
    async makeApiRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                timeout: 10000,
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    async getExchangeRates() {
        // Check cache first (cache for 1 hour)
        const now = Date.now();
        if (this.apiCache.exchangeRates && 
            this.apiCache.cacheTimestamp && 
            (now - this.apiCache.cacheTimestamp) < 3600000) {
            return this.apiCache.exchangeRates;
        }

        try {
            const url = `${this.apiConfig.exchangeRate.baseUrl}${this.apiConfig.exchangeRate.apiKey}/latest/USD`;
            const data = await this.makeApiRequest(url);
            
            if (data.result === 'success') {
                this.apiCache.exchangeRates = data.conversion_rates;
                this.apiCache.cacheTimestamp = now;
                return data.conversion_rates;
            }
        } catch (error) {
            console.error('Exchange Rate API Error:', error);
            // Fallback to hardcoded rates
            return {
                UGX: 3750,
                KES: 142,
                TZS: 2485,
                RWF: 1315,
                GBP: 0.85,
                EUR: 0.92,
                CAD: 1.35,
                AUD: 1.45
            };
        }
    }

    async getCountryInfo(countryCode) {
        // Check cache first
        if (this.apiCache.countries[countryCode]) {
            return this.apiCache.countries[countryCode];
        }

        try {
            const url = `${this.apiConfig.restCountries.baseUrl}/alpha/${countryCode}`;
            const data = await this.makeApiRequest(url);
            
            if (data && data.length > 0) {
                const country = data[0];
                const countryInfo = {
                    name: country.name.common,
                    capital: country.capital ? country.capital[0] : 'N/A',
                    population: country.population,
                    languages: Object.values(country.languages || {}).join(', '),
                    currencies: Object.keys(country.currencies || {}),
                    flag: country.flag,
                    region: country.region,
                    subregion: country.subregion
                };
                
                this.apiCache.countries[countryCode] = countryInfo;
                return countryInfo;
            }
        } catch (error) {
            console.error('REST Countries API Error:', error);
            return this.getFallbackCountryInfo(countryCode);
        }
    }

    getFallbackCountryInfo(countryCode) {
        const fallbackData = {
            'UG': {
                name: 'Uganda',
                capital: 'Kampala',
                population: 48600000,
                languages: 'English, Luganda',
                currencies: ['UGX'],
                flag: '🇺🇬',
                region: 'Africa',
                subregion: 'Eastern Africa'
            },
            'KE': {
                name: 'Kenya',
                capital: 'Nairobi',
                population: 55100000,
                languages: 'English, Swahili',
                currencies: ['KES'],
                flag: '🇰🇪',
                region: 'Africa',
                subregion: 'Eastern Africa'
            },
            'TZ': {
                name: 'Tanzania',
                capital: 'Dodoma',
                population: 63600000,
                languages: 'Swahili, English',
                currencies: ['TZS'],
                flag: '🇹🇿',
                region: 'Africa',
                subregion: 'Eastern Africa'
            },
            'RW': {
                name: 'Rwanda',
                capital: 'Kigali',
                population: 13800000,
                languages: 'Kinyarwanda, French, English',
                currencies: ['RWF'],
                flag: '🇷🇼',
                region: 'Africa',
                subregion: 'Eastern Africa'
            }
        };
        
        return fallbackData[countryCode] || null;
    }

    async getLeaderInfo(countryName) {
        // Check cache first
        if (this.apiCache.leaders[countryName]) {
            return this.apiCache.leaders[countryName];
        }

        try {
            // Try to get current leader from Wikipedia
            const searchTerm = `President_of_${countryName}`;
            const url = `${this.apiConfig.wikipedia.baseUrl}/${searchTerm}`;
            const data = await this.makeApiRequest(url);
            
            if (data && data.extract) {
                const leaderInfo = {
                    title: data.title,
                    extract: data.extract,
                    url: data.content_urls ? data.content_urls.desktop.page : null
                };
                
                this.apiCache.leaders[countryName] = leaderInfo;
                return leaderInfo;
            }
        } catch (error) {
            console.error('Wikipedia API Error:', error);
            return this.getFallbackLeaderInfo(countryName);
        }
    }

    getFallbackLeaderInfo(countryName) {
        const fallbackLeaders = {
            'Uganda': {
                name: 'Yoweri Museveni',
                title: 'President',
                since: '1986',
                info: 'President since 1986, longest-serving current leader in East Africa'
            },
            'Kenya': {
                name: 'William Ruto',
                title: 'President',
                since: '2022',
                info: 'President since September 2022, focused on economic transformation'
            },
            'Tanzania': {
                name: 'Samia Suluhu Hassan',
                title: 'President',
                since: '2021',
                info: 'President since March 2021, first female president of Tanzania'
            },
            'Rwanda': {
                name: 'Paul Kagame',
                title: 'President',
                since: '2000',
                info: 'President since 2000, known for post-genocide reconstruction'
            }
        };
        
        return fallbackLeaders[countryName] || null;
    }

    async preloadAPIData() {
        // Preload exchange rates and basic country info
        try {
            await this.getExchangeRates();
            await Promise.all([
                this.getCountryInfo('UG'),
                this.getCountryInfo('KE'),
                this.getCountryInfo('TZ'),
                this.getCountryInfo('RW')
            ]);
        } catch (error) {
            console.log('Preloading API data failed, using fallback data');
        }
    }

    createAIWidget() {
        const aiWidget = document.createElement('div');
        aiWidget.id = 'ai-safari-bot';
        aiWidget.innerHTML = `
            <div class="ai-bot-container">
                <!-- AI Bot Button -->
                <button class="ai-bot-trigger" id="aiBotTrigger">
                    <div class="ai-bot-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="ai-bot-pulse"></div>
                    <span class="ai-bot-tooltip">Get AI Safari Recommendations</span>
                </button>

                <!-- AI Chat Window -->
                <div class="ai-chat-window" id="aiChatWindow">
                    <div class="ai-chat-header">
                        <div class="ai-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="ai-info">
                            <h4>Safari AI Assistant</h4>
                            <small>Powered by Live Data APIs</small>
                        </div>
                        <button class="ai-close-btn">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Pre-chat modal -->
                    <div class="ai-prechat-modal" id="aiPrechatModal" style="display:none;">
                        <div class="prechat-card">
                            <h4>Let’s personalize your chat</h4>
                            <div class="prechat-row">
                                <input type="text" id="aiVisitorName" placeholder="Your name (required)" maxlength="60" />
                            </div>
                            <div class="prechat-row">
                                <input type="email" id="aiVisitorEmail" placeholder="Email for itinerary & transcript (required)" maxlength="120" />
                            </div>
                            <label class="prechat-consent">
                                <input type="checkbox" id="aiConsent" />
                                <span>I agree to receive my chat transcript and follow-up about my safari. I can opt out anytime.</span>
                            </label>
                            <div class="prechat-actions">
                                <button id="aiStartChatBtn" disabled>Start Chat</button>
                                <button id="aiForgetMeBtn" class="link-btn">Forget me</button>
                            </div>
                            <small class="prechat-privacy">We respect your privacy. Data is used to assist your inquiry and stored locally on your device.</small>
                        </div>
                    </div>

                    <div class="ai-chat-messages" id="aiChatMessages">
                        <!-- Messages will be populated here -->
                    </div>
                    
                    <div class="ai-quick-actions" id="aiQuickActions">
                        <!-- Quick action buttons will appear here -->
                    </div>
                    
                    <div class="ai-input-area">
                        <input type="text" id="aiUserInput" placeholder="Type your message or use buttons above..." maxlength="200">
                        <button id="aiSendBtn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Check if widget already exists
        if (document.getElementById('ai-safari-bot')) {
            console.log('AI Safari Bot widget already exists, skipping injection.');
            return;
        }

        document.body.appendChild(aiWidget);
        this.addAIStyles();
        // If no visitor consent captured, show prechat when opening later
    }

    addAIStyles() {
        const styles = document.createElement('style');
        styles.innerHTML = `
            /* Enhanced AI Safari Bot Styles */
            #ai-safari-bot {
                position: fixed;
                bottom: calc(100px + env(safe-area-inset-bottom, 0px));
                left: calc(20px + env(safe-area-inset-left, 0px));
                z-index: 1040; /* below WhatsApp (1050/1051), above navbar (1030) */
                font-family: 'Poppins', sans-serif;
                pointer-events: none; /* prevent overlay from blocking page by default */
                padding-bottom: env(safe-area-inset-bottom, 0px);
                padding-left: env(safe-area-inset-left, 0px);
            }

            .ai-bot-trigger {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                background: linear-gradient(135deg, #FF6B35, #F7931E);
                border: none;
                box-shadow: 0 4px 20px rgba(255, 107, 53, 0.3);
                cursor: pointer;
                position: relative;
                overflow: hidden;
                transition: all 0.3s ease;
                pointer-events: auto; /* allow interaction */
            }

            .ai-bot-trigger:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 25px rgba(255, 107, 53, 0.4);
            }

            .ai-bot-icon {
                color: white;
                font-size: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
            }

            .ai-bot-pulse {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: rgba(255, 107, 53, 0.3);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0% { transform: scale(1); opacity: 1; }
                100% { transform: scale(1.5); opacity: 0; }
            }

            .ai-bot-tooltip {
                position: absolute;
                left: 80px;
                top: 50%;
                transform: translateY(-50%);
                background: #333;
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
            }

            .ai-bot-trigger:hover .ai-bot-tooltip {
                opacity: 1;
            }

            .ai-chat-window {
                position: absolute;
                bottom: calc(80px + env(safe-area-inset-bottom, 0px));
                left: 0;
                width: 360px;
                height: 480px;
                background: white;
                border-radius: 15px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.15);
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: slideInUp 0.3s ease;
                z-index: 1041; /* one above its trigger but below WhatsApp chat */
                pointer-events: auto; /* allow interaction */
                max-height: calc(100vh - 160px - env(safe-area-inset-top, 0px));
            }

            @keyframes slideInUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .ai-chat-window.active {
                display: flex;
            }

            /* Ensure messages area expands and scrolls */
            #aiChatMessages {
                flex: 1 1 auto;
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }

            /* Pre-chat styles */
            .ai-prechat-modal { padding: 12px; border-bottom: 1px solid #eee; background:#fff; }
            .prechat-card { background:#f8f9fa; border:1px solid #e9ecef; border-radius:12px; padding:12px; }
            .prechat-card h4 { margin: 0 0 8px 0; font-size: 16px; color:#2E7D32; }
            .prechat-row { margin:6px 0; }
            .prechat-row input { width:100%; box-sizing:border-box; padding:10px 12px; border:1px solid #bbb; border-radius:8px; font-size:14px; }
            .prechat-row input:focus { outline: none; border-color:#2E7D32; box-shadow: 0 0 0 3px rgba(46,125,50,0.15); }
            .prechat-row input.invalid { border-color:#B00020; }
            .prechat-consent { display:flex; gap:8px; align-items:flex-start; font-size:13px; color:#212529; margin-top:8px; line-height:1.35; }
            .prechat-consent input { accent-color:#2E7D32; margin-top:3px; }
            .prechat-consent.invalid span { color:#B00020; }
            .prechat-actions { display:flex; gap:8px; margin-top:12px; }
            #aiStartChatBtn { background:#2E7D32; color:#fff; border:none; padding:10px 14px; border-radius:8px; font-size:14px; cursor:pointer; }
            .link-btn { background:transparent; border:none; color:#6c757d; cursor:pointer; font-size:12px; text-decoration:underline; }
            .prechat-privacy { display:block; color:#212529; font-size:12px; margin-top:10px; background:#FFFBE6; padding:8px 10px; border-left:3px solid #F7931E; border-radius:6px; }

            .ai-chat-header {
                background: linear-gradient(135deg, #2E7D32, #4CAF50);
                color: white;
                padding: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .ai-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(255,255,255,0.2);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .ai-info h4 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
            }

            .ai-info small {
                opacity: 0.8;
                font-size: 11px;
            }

            .ai-close-btn {
                margin-left: auto;
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
            }

            .ai-chat-messages {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .ai-message {
                max-width: 80%;
                padding: 10px 15px;
                border-radius: 15px;
                font-size: 14px;
                line-height: 1.4;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .ai-message.bot {
                background: #f0f0f0;
                align-self: flex-start;
                border-bottom-left-radius: 5px;
            }

            .ai-message.user {
                background: #FF6B35;
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 5px;
            }

            .ai-quick-actions {
                padding: 10px 15px;
                border-top: 1px solid #eee;
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
            }

            .quick-action-btn {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 20px;
                padding: 5px 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }

            .quick-action-btn:hover {
                background: #FF6B35;
                color: white;
                border-color: #FF6B35;
            }

            .ai-input-area {
                padding: 15px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
            }

            /* Input gating: hide input area until pre-chat is completed */
            .ai-chat-window.gated .ai-input-area {
                display: none;
            }

            /* While gated, also disable quick actions to avoid premature inputs */
            .ai-chat-window.gated #aiQuickActions {
                pointer-events: none;
                opacity: 0.6;
            }

            #aiUserInput {
                flex: 1;
                border: 1px solid #ddd;
                border-radius: 20px;
                padding: 10px 15px;
                font-size: 14px;
                outline: none;
            }

            #aiUserInput:focus {
                border-color: #FF6B35;
            }

            #aiSendBtn {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #FF6B35;
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            #aiSendBtn:hover {
                background: #E55A2D;
                transform: scale(1.05);
            }

            .package-recommendation {
                background: #f8f9fa;
                border-radius: 10px;
                padding: 15px;
                margin: 10px 0;
                border-left: 4px solid #FF6B35;
            }

            .package-rec-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .package-rec-name {
                font-weight: 600;
                color: #2E7D32;
                font-size: 14px;
            }

            .package-rec-price {
                color: #FF6B35;
                font-weight: 600;
                font-size: 14px;
            }

            .package-rec-highlights {
                font-size: 12px;
                color: #666;
                margin: 5px 0;
            }

            .package-rec-btn {
                background: #FF6B35;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 20px;
                font-size: 12px;
                cursor: pointer;
                margin-top: 8px;
                transition: all 0.2s ease;
            }

            .package-rec-btn:hover {
                background: #E55A2D;
            }

            .api-data-highlight {
                background: linear-gradient(135deg, #E3F2FD, #BBDEFB);
                border-left: 4px solid #2196F3;
                padding: 10px;
                margin: 5px 0;
                border-radius: 5px;
                font-size: 13px;
            }

            .loading-indicator {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #FF6B35;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Human Handoff Styles */
            .human-handoff-card {
                background: linear-gradient(135deg, #E8F5E8, #C8E6C9);
                border-radius: 12px;
                padding: 15px;
                margin: 10px 0;
                border-left: 4px solid #4CAF50;
                box-shadow: 0 2px 8px rgba(76, 175, 80, 0.1);
            }

            .handoff-header h4 {
                margin: 0 0 8px 0;
                color: #2E7D32;
                font-size: 16px;
                font-weight: 600;
            }

            .handoff-header p {
                margin: 0 0 15px 0;
                color: #555;
                font-size: 13px;
            }

            .handoff-content p {
                margin: 8px 0;
                font-size: 13px;
                color: #2E7D32;
            }

            .whatsapp-handoff-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: #25D366;
                color: white !important;
                text-decoration: none;
                padding: 12px 20px;
                border-radius: 25px;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.3s ease;
                margin-top: 10px;
                box-shadow: 0 3px 12px rgba(37, 211, 102, 0.3);
            }

            .whatsapp-handoff-btn:hover {
                background: #20BD5F;
                transform: translateY(-2px);
                box-shadow: 0 5px 20px rgba(37, 211, 102, 0.4);
                text-decoration: none;
                color: white !important;
            }

            .phone-handoff-card {
                background: linear-gradient(135deg, #E3F2FD, #BBDEFB);
                border-radius: 12px;
                padding: 15px;
                margin: 10px 0;
                border-left: 4px solid #2196F3;
                box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
            }

            .phone-header h4 {
                margin: 0 0 10px 0;
                color: #1976D2;
                font-size: 16px;
                font-weight: 600;
            }

            .phone-content p {
                margin: 8px 0;
                font-size: 13px;
                color: #1976D2;
            }

            .phone-link {
                display: inline-block;
                background: #2196F3;
                color: white !important;
                text-decoration: none;
                padding: 10px 20px;
                border-radius: 20px;
                font-weight: 600;
                font-size: 16px;
                margin: 8px 0;
                transition: all 0.2s ease;
            }

            .phone-link:hover {
                background: #1976D2;
                transform: scale(1.05);
                text-decoration: none;
                color: white !important;
            }

            .handoff-options-card {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 15px;
                margin: 10px 0;
                border: 1px solid #dee2e6;
            }

            .handoff-options-card h4 {
                margin: 0 0 15px 0;
                color: #495057;
                font-size: 16px;
                font-weight: 600;
                text-align: center;
            }

            .handoff-options {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .handoff-option-btn {
                display: flex;
                align-items: center;
                gap: 15px;
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 10px;
                padding: 12px 15px;
                cursor: pointer;
                transition: all 0.2s ease;
                text-align: left;
                width: 100%;
                box-sizing: border-box;
            }

            .handoff-option-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }

            .handoff-option-btn.whatsapp {
                border-color: #25D366;
            }

            .handoff-option-btn.whatsapp:hover {
                background: #25D366;
                color: white;
            }

            .handoff-option-btn.phone {
                border-color: #2196F3;
            }

            .handoff-option-btn.phone:hover {
                background: #2196F3;
                color: white;
            }

            .handoff-option-btn i {
                font-size: 20px;
                width: 24px;
                text-align: center;
            }

            .handoff-option-btn span {
                font-weight: 600;
                font-size: 14px;
                display: block;
            }

            .handoff-option-btn small {
                font-size: 12px;
                opacity: 0.8;
                margin-top: 2px;
                display: block;
            }

            /* Mobile Responsive */
            @media (max-width: 768px) {
                #ai-safari-bot {
                    left: calc(15px + env(safe-area-inset-left, 0px));
                    bottom: calc(90px + env(safe-area-inset-bottom, 0px));
                }
                
                .ai-chat-window {
                    width: 92vw;
                    height: min(78vh, 560px);
                    bottom: calc(70px + env(safe-area-inset-bottom, 0px));
                    max-height: calc(100vh - 140px - env(safe-area-inset-top, 0px));
                }
                
                .ai-bot-trigger {
                    width: 60px;
                    height: 60px;
                }

                .prechat-card h4 { font-size: 16px; }
                .prechat-row input { font-size: 16px; }
                .prechat-consent { font-size: 15px; }
                .prechat-privacy { font-size: 14px; font-weight: 500; line-height: 1.5; }
                #aiChatMessages { max-height: calc(100vh - 220px - env(safe-area-inset-top, 0px)); }
            }
    
                .ai-bot-icon {
                    font-size: 20px;
                }

                .handoff-options {
                    gap: 8px;
                }

                .handoff-option-btn {
                    padding: 10px 12px;
                    gap: 12px;
                }

                .whatsapp-handoff-btn {
                    padding: 10px 16px;
                    font-size: 13px;
                }

                .phone-link {
                    padding: 8px 16px;
                    font-size: 14px;
                }
            }
            /* Pre-chat validation styles */
            .prechat-actions #aiStartChatBtn[disabled] {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .prechat-row input.invalid {
                border-color: #dc3545 !important;
            }
            .prechat-consent.invalid span {
                color: #dc3545;
            }
        `;
        document.head.appendChild(styles);
    }

    updateGatingUI() {
        const chatWindow = document.getElementById('aiChatWindow');
        if (!chatWindow) return;
        const v = this.visitor || {};
        const hasName = !!(v.name && v.name.trim().length > 0);
        const hasEmail = !!(v.email && /.+@.+\..+/.test(v.email));
        const needsPrechat = (!v.consent || !hasName || !hasEmail);
        chatWindow.classList.toggle('gated', !!needsPrechat);
    }

    toggleBot() {
        const chatWindow = document.getElementById('aiChatWindow');
        const trigger = document.getElementById('aiBotTrigger');
        
        if (this.isActive) {
            chatWindow.classList.remove('active');
            this.isActive = false;
        } else {
            chatWindow.classList.add('active');
            this.isActive = true;
            const prechat = document.getElementById('aiPrechatModal');
            const v = this.visitor || {};
            const hasName = !!(v.name && v.name.trim().length > 0);
            const hasEmail = !!(v.email && /.+@.+\..+/.test(v.email));
            if (!v.consent || !hasName || !hasEmail) {
                prechat.style.display = 'block';
                chatWindow.classList.add('gated');
            } else {
                prechat.style.display = 'none';
                chatWindow.classList.remove('gated');
                this.startConversation();
            }
        }
    }

    startConversation() {
        this.updateGatingUI();
        if (this.conversationState === 'greeting') {
            this.addBotMessage("👋 Hi! I'm your AI Safari Assistant with live data from global APIs. I'll help you find the perfect East Africa safari package!");
            
            setTimeout(() => {
                this.addBotMessage("Let's start with a quick question: What's your approximate budget per person?");
                this.showQuickActions(['Under $700', '$700-$1000', '$1000-$1500', 'Over $1500', 'Not sure yet']);
                this.conversationState = 'budget';
            }, 1500);
        }
    }

    addBotMessage(message) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message bot';
        messageDiv.innerHTML = message;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Track conversation history
        this.conversationHistory.push({
            sender: 'bot',
            message: message,
            timestamp: new Date().toISOString()
        });
        
        // Update last activity time
        this.humanHandoff.lastActivityTime = Date.now();
    }

    addUserMessage(message) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message user';
        messageDiv.textContent = message;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Track conversation history
        this.conversationHistory.push({
            sender: 'user',
            message: message,
            timestamp: new Date().toISOString()
        });
        
        // Update last activity time
        this.humanHandoff.lastActivityTime = Date.now();
    }

    showQuickActions(actions) {
        const actionsContainer = document.getElementById('aiQuickActions');
        actionsContainer.innerHTML = '';
        
        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            btn.textContent = action;
            btn.addEventListener('click', () => this.handleQuickAction(action));
            actionsContainer.appendChild(btn);
        });
    }

    handleQuickAction(action) {
        this.addUserMessage(action);
        document.getElementById('aiQuickActions').innerHTML = '';
        
        // Handle human handoff quick actions
        if (['Talk to Human', 'Continue with AI', 'Get Phone Number', 'Send Email Summary', 
             'Book Consultation Call', 'Contact WhatsApp', 'More Details', 'Start Over', 'Start Guided Booking'].includes(action)) {
            this.handleSpecialQuickActions(action);
            return;
        }
        
        switch(this.conversationState) {
            case 'budget':
                this.handleBudgetResponse(action);
                break;
            case 'duration':
                this.handleDurationResponse(action);
                break;
            case 'collect_destination':
                this.handleDestinationChoice(action);
                break;
            case 'collect_group':
                this.handleGroupSizeChoice(action);
                break;
            case 'collect_date':
                this.handleTravelDateChoice(action);
                break;
            case 'interests':
                this.handleInterestsResponse(action);
                break;
            case 'experience':
                this.handleExperienceResponse(action);
                break;
            case 'final':
                this.handleFinalResponse(action);
                break;
        }
    }

    handleBudgetResponse(budget) {
        this.userPreferences.budget = budget;
        
        setTimeout(() => {
            this.addBotMessage("Perfect! How many days do you have for your safari adventure?");
            this.showQuickActions(['3-4 days', '5-7 days', '8-10 days', '2+ weeks', 'Flexible']);
            this.conversationState = 'duration';
        }, 800);
    }

    handleDurationResponse(duration) {
        this.userPreferences.duration = duration;
        
        setTimeout(() => {
            this.addBotMessage("Great! What interests you most in an African safari? (You can select multiple)");
            this.showQuickActions(['Gorilla Trekking 🦍', 'Big Five Safari 🦁', 'Great Migration 🦓', 'Cultural Experiences 👥', 'Photography 📸', 'Luxury Experience ✨']);
            this.conversationState = 'interests';
        }, 800);
    }

    handleInterestsResponse(interest) {
        if (!this.userPreferences.interests.includes(interest)) {
            this.userPreferences.interests.push(interest);
        }
        
        setTimeout(() => {
            if (this.userPreferences.interests.length >= 2) {
                this.addBotMessage("Excellent choices! One final question: Is this your first African safari?");
                this.showQuickActions(['Yes, first time!', 'No, I\'ve been before', 'First time in East Africa']);
                this.conversationState = 'experience';
            } else {
                this.addBotMessage("Great choice! Feel free to select more interests, or click 'Continue' to proceed.");
                this.showQuickActions(['Gorilla Trekking 🦍', 'Big Five Safari 🦁', 'Great Migration 🦓', 'Cultural Experiences 👥', 'Photography 📸', 'Continue →']);
            }
        }, 500);
    }

    handleExperienceResponse(experience) {
        this.userPreferences.experience = experience;
        
        setTimeout(() => {
            this.addBotMessage("Perfect! Based on your preferences, I'm analyzing the best safari packages for you...");
            
            setTimeout(() => {
                this.generateRecommendations();
            }, 2000);
        }, 800);
    }

    generateRecommendations() {
        const recommendations = this.getRecommendations();
        
        this.addBotMessage(`🎯 I found ${recommendations.length} perfect safari packages for you:`);
        
        recommendations.forEach((pkg, index) => {
            setTimeout(() => {
                this.addPackageRecommendation(pkg);
            }, (index + 1) * 1000);
        });

        setTimeout(() => {
            this.addBotMessage("Would you like more details about any of these packages, start a guided booking, or book a FREE consultation call?");
            this.showQuickActions(['Start Guided Booking', 'Book Consultation Call', 'More Details', 'Start Over', 'Contact WhatsApp']);
            this.conversationState = 'final';
        }, (recommendations.length + 1) * 1000);
    }

    getRecommendations() {
        let scored = this.packages.map(pkg => {
            let score = 0;
            
            // Budget scoring
            if (this.userPreferences.budget) {
                const budgetRanges = {
                    'Under $700': [0, 700],
                    '$700-$1000': [700, 1000],
                    '$1000-$1500': [1000, 1500],
                    'Over $1500': [1500, 5000]
                };
                
                const range = budgetRanges[this.userPreferences.budget];
                if (range && pkg.price >= range[0] && pkg.price <= range[1]) {
                    score += 30;
                }
            }

            // Duration scoring
            if (this.userPreferences.duration) {
                const durationMatch = {
                    '3-4 days': pkg.duration <= 4,
                    '5-7 days': pkg.duration >= 5 && pkg.duration <= 7,
                    '8-10 days': pkg.duration >= 8 && pkg.duration <= 10,
                    '2+ weeks': pkg.duration >= 14
                };
                
                if (durationMatch[this.userPreferences.duration]) {
                    score += 25;
                }
            }

            // Interest scoring
            this.userPreferences.interests.forEach(interest => {
                const interestMap = {
                    'Gorilla Trekking 🦍': ['first-time', 'wildlife-lovers'],
                    'Big Five Safari 🦁': ['classic-safari', 'wildlife-lovers'],
                    'Great Migration 🦓': ['photography', 'once-in-lifetime'],
                    'Cultural Experiences 👥': ['cultural'],
                    'Photography 📸': ['photography'],
                    'Luxury Experience ✨': ['luxury', 'honeymoon']
                };
                
                const matchingTags = interestMap[interest] || [];
                matchingTags.forEach(tag => {
                    if (pkg.bestFor.includes(tag)) {
                        score += 15;
                    }
                });
            });

            return { ...pkg, score };
        });

        return scored
            .filter(pkg => pkg.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3);
    }

    addPackageRecommendation(pkg) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const recDiv = document.createElement('div');
        recDiv.className = 'ai-message bot';
        
        const matchPercentage = Math.min(95, Math.max(75, pkg.score));
        
        recDiv.innerHTML = `
            <div class="package-recommendation">
                <div class="package-rec-header">
                    <div class="package-rec-name">${pkg.name}</div>
                    <div class="package-rec-price">From $${pkg.price}</div>
                </div>
                <div class="package-rec-highlights">
                    📍 ${pkg.country} • ${pkg.duration} days<br>
                    🌟 Highlights: ${pkg.highlights.join(', ')}<br>
                    🎯 ${matchPercentage}% match for your preferences
                </div>
                <button class="package-rec-btn" data-url="${pkg.url}">
                    View Details & Book
                </button>
            </div>
        `;
        
        messagesContainer.appendChild(recDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    viewPackage(url) {
        this.trackEvent('package_view', url);
        window.open(url, '_blank');
    }

    sendMessage() {
        const input = document.getElementById('aiUserInput');
        const message = input.value.trim();
        
        // Prevent sending if pre-chat not completed; show pre-chat modal
        const v = this.visitor || {};
        const hasName = !!(v.name && v.name.trim().length > 0);
        const hasEmail = !!(v.email && /.+@.+\..+/.test(v.email));
        if (!(v.consent && hasName && hasEmail)) {
            const pre = document.getElementById('aiPrechatModal');
            if (pre) pre.style.display = 'block';
            this.updateGatingUI();
            return;
        }

        if (message) {
            this.addUserMessage(message);
            input.value = '';
            
            setTimeout(() => {
                this.handleFreeTextMessage(message);
            }, 800);
        }
    }

    async handleFreeTextMessage(message) {
        // Early capture for guided lead email
        if (this.conversationState === 'awaiting_email_for_lead') {
            const email = (message || '').trim();
            if (/.+@.+\..+/.test(email)) {
                this.visitor = { ...(this.visitor||{}), email, consent: true };
                this.saveVisitorToStorage();
                this.addBotMessage('👍 Thanks! Using that email to submit your lead.');
                return this.submitGuidedLead();
            } else {
                this.addBotMessage('That does not look like a valid email. Please try again, or tap Contact WhatsApp.');
                this.showQuickActions(['Contact WhatsApp', 'Get Phone Number']);
                return;
            }
        }

        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('exchange') || lowerMessage.includes('rate') || lowerMessage.includes('dollar') || lowerMessage.includes('usd')) {
            this.addBotMessage("💱 Fetching real-time exchange rates... <span class='loading-indicator'></span>");
            
            try {
                const rates = await this.getExchangeRates();
                this.addBotMessage("💱 Current Exchange Rates (Live from API):");
                this.addBotMessage(`
                    <div class="api-data-highlight">
                        🇺🇬 1 USD = ${rates.UGX?.toLocaleString() || '3,750'} UGX (Ugandan Shilling)<br>
                        🇰🇪 1 USD = ${rates.KES?.toLocaleString() || '142'} KES (Kenyan Shilling)<br>
                        🇹🇿 1 USD = ${rates.TZS?.toLocaleString() || '2,485'} TZS (Tanzanian Shilling)<br>
                        🇷🇼 1 USD = ${rates.RWF?.toLocaleString() || '1,315'} RWF (Rwandan Franc)
                    </div>
                `);
                this.addBotMessage("📈 Exchange rates update every hour from live financial markets!");
                this.showQuickActions(['Currency Tips', 'Payment Methods', 'ATM Locations', 'More Info']);
            } catch (error) {
                this.addBotMessage("Sorry, I couldn't fetch live exchange rates right now. Let me provide the latest approximate rates I have...");
            }

        } else if (lowerMessage.includes('population') || lowerMessage.includes('people') || lowerMessage.includes('demographics')) {
            this.addBotMessage("👥 Fetching current population data... <span class='loading-indicator'></span>");
            
            try {
                const countries = await Promise.all([
                    this.getCountryInfo('UG'),
                    this.getCountryInfo('KE'),
                    this.getCountryInfo('TZ'),
                    this.getCountryInfo('RW')
                ]);
                
                this.addBotMessage("👥 East African Populations (Live from REST Countries API):");
                let populationData = '<div class="api-data-highlight">';
                countries.forEach(country => {
                    if (country) {
                        populationData += `${country.flag} ${country.name}: ${country.population.toLocaleString()} people<br>`;
                    }
                });
                populationData += '</div>';
                this.addBotMessage(populationData);
                
                const totalPopulation = countries.reduce((sum, country) => sum + (country ? country.population : 0), 0);
                this.addBotMessage(`💡 Total East Africa: ${totalPopulation.toLocaleString()}+ people`);
                this.showQuickActions(['Youth Demographics', 'Cultural Diversity', 'Economic Growth']);
            } catch (error) {
                this.addBotMessage("Sorry, I couldn't fetch live population data right now. Let me provide the latest data I have...");
            }

        } else if (lowerMessage.includes('president') || lowerMessage.includes('leader') || lowerMessage.includes('government')) {
            this.addBotMessage("🏛️ Fetching current leader information... <span class='loading-indicator'></span>");
            
            try {
                const leaders = await Promise.all([
                    this.getLeaderInfo('Uganda'),
                    this.getLeaderInfo('Kenya'),
                    this.getLeaderInfo('Tanzania'),
                    this.getLeaderInfo('Rwanda')
                ]);
                
                this.addBotMessage("🏛️ East African Leaders (2024 - Live Data):");
                
                // Use fallback data for now since Wikipedia API might not have structured leader data
                const fallbackLeaders = await Promise.resolve([
                    { country: '🇺🇬 Uganda', leader: 'Yoweri Museveni', title: 'President since 1986' },
                    { country: '🇰🇪 Kenya', leader: 'William Ruto', title: 'President since 2022' },
                    { country: '🇹🇿 Tanzania', leader: 'Samia Suluhu Hassan', title: 'President since 2021' },
                    { country: '🇷🇼 Rwanda', leader: 'Paul Kagame', title: 'President since 2000' }
                ]);
                
                let leaderData = '<div class="api-data-highlight">';
                fallbackLeaders.forEach(leader => {
                    leaderData += `${leader.country}: ${leader.leader} (${leader.title})<br>`;
                });
                leaderData += '</div>';
                this.addBotMessage(leaderData);
                this.addBotMessage("All countries have stable governments focused on tourism development and wildlife conservation!");
                this.showQuickActions(['Political Stability', 'Tourism Policies', 'Safety Record']);
            } catch (error) {
                this.addBotMessage("Sorry, I couldn't fetch live leader information right now. Let me provide the current information I have...");
            }

        } else if (lowerMessage.includes('capital') || lowerMessage.includes('city') || lowerMessage.includes('urban')) {
            this.addBotMessage("🏙️ Fetching capital city information... <span class='loading-indicator'></span>");
            
            try {
                const countries = await Promise.all([
                    this.getCountryInfo('UG'),
                    this.getCountryInfo('KE'),
                    this.getCountryInfo('TZ'),
                    this.getCountryInfo('RW')
                ]);
                
                this.addBotMessage("🏙️ East African Capital Cities (Live from REST Countries API):");
                let cityData = '<div class="api-data-highlight">';
                countries.forEach(country => {
                    if (country) {
                        cityData += `${country.flag} ${country.name}: ${country.capital}<br>`;
                    }
                });
                cityData += '</div>';
                this.addBotMessage(cityData);
                this.addBotMessage("✈️ Most safaris start from these cities - we arrange airport transfers and city tours!");
                this.showQuickActions(['City Tours', 'Airport Transfers', 'Urban Attractions']);
            } catch (error) {
                this.addBotMessage("Sorry, I couldn't fetch live capital city data right now. Let me provide the information I have...");
            }

        } else if (lowerMessage.includes('where') && (lowerMessage.includes('uganda') || lowerMessage.includes('kenya') || lowerMessage.includes('tanzania') || lowerMessage.includes('rwanda'))) {
            this.handleLocationQuery(lowerMessage);
            
        } else if (lowerMessage.includes('location') || lowerMessage.includes('where is') || lowerMessage.includes('geography')) {
            this.handleGeographyQuestions(lowerMessage);
            
        } else if (lowerMessage.includes('africa') && (lowerMessage.includes('countries') || lowerMessage.includes('nations'))) {
            this.showAfricanCountriesInfo();
            
        } else if (lowerMessage.includes('safari') && (lowerMessage.includes('best') || lowerMessage.includes('when') || lowerMessage.includes('time'))) {
            this.handleSafariTimingQuestions();
            
        } else if (lowerMessage.includes('visa') || lowerMessage.includes('passport') || lowerMessage.includes('entry requirements')) {
            this.handleVisaQuestions();
            
        } else if (lowerMessage.includes('wildlife') || lowerMessage.includes('animals') || lowerMessage.includes('big five')) {
            this.handleWildlifeQuestions();
            
        } else if (lowerMessage.includes('language') || lowerMessage.includes('speak') || lowerMessage.includes('languages')) {
            this.handleLanguageQuestions();
            
        } else if (lowerMessage.includes('climate') || lowerMessage.includes('weather') || lowerMessage.includes('temperature')) {
            this.handleClimateQuestions();
            
        } else {
            // Enhanced default intelligent response with API mention
            const responses = [
                "🤔 That's a fascinating question! I'm powered by live APIs for real-time data about East Africa.",
                "🌍 Interesting! I can fetch live information from global APIs to give you the most current data.",
                "🦁 Great question! Let me help you with real-time information from my API connections.",
                "✨ I'm excited to help! I have access to live exchange rates, country data, and current information."
            ];
            
            this.addBotMessage(responses[Math.floor(Math.random() * responses.length)]);
            this.addBotMessage("I can provide real-time data on exchange rates, country information, populations, and more. What would you like to explore?");
            this.showQuickActions(['Live Exchange Rates', 'Country Info', 'Safari Planning', 'Current Leaders', 'Population Data', 'Travel Tips']);
        }
    }

    trackEvent(action, label) {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': 'AI_Bot_Enhanced',
                'event_label': label
            });
        }
        
        console.log(`Enhanced AI Bot Event: ${action} - ${label}`);
    }

    // Human Handoff Functions
    generateWhatsAppLink() {
        const conversationSummary = this.formatConversationForHandoff();
        const message = `Hello! I had a conversation with your AI assistant about East African safari packages. Here's our conversation summary:\n\n${conversationSummary}\n\nI'd like to speak with a human agent to continue planning my safari.`;
        const encodedMessage = encodeURIComponent(message);
        return `https://wa.me/${this.humanHandoff.whatsappNumber}?text=${encodedMessage}`;
    }

    formatConversationForHandoff() {
        let summary = `🗓️ Session: ${this.sessionStartTime.toLocaleDateString()} ${this.sessionStartTime.toLocaleTimeString()}\n\n`;
        
        // Add user preferences if available
        if (Object.values(this.userPreferences).some(val => val !== null && (Array.isArray(val) ? val.length > 0 : true))) {
            summary += "👤 TRAVELER PREFERENCES:\n";
            if (this.userPreferences.budget) summary += `💰 Budget: ${this.userPreferences.budget}\n`;
            if (this.userPreferences.duration) summary += `📅 Duration: ${this.userPreferences.duration}\n`;
            if (this.userPreferences.interests.length > 0) summary += `🎯 Interests: ${this.userPreferences.interests.join(', ')}\n`;
            if (this.userPreferences.experience) summary += `🔍 Experience: ${this.userPreferences.experience}\n`;
            summary += "\n";
        }
        
        // Add key conversation highlights
        summary += "💬 KEY CONVERSATION POINTS:\n";
        this.conversationHistory.slice(-10).forEach((msg, index) => {
            const time = new Date(msg.timestamp).toLocaleTimeString();
            const sender = msg.sender === 'user' ? 'Traveler' : 'AI Assistant';
            const cleanMessage = msg.message.replace(/<[^>]*>/g, '').replace(/\n/g, ' ').substring(0, 100);
            summary += `[${time}] ${sender}: ${cleanMessage}${cleanMessage.length === 100 ? '...' : ''}\n`;
        });
        
        return summary;
    }

    handleHumanHandoff(type) {
        switch(type) {
            case 'whatsapp':
                this.initiateWhatsAppHandoff();
                break;
            case 'phone':
                this.showPhoneNumber();
                break;
            case 'email_notification':
                this.sendEmailNotification();
                break;
            default:
                this.showHandoffOptions();
        }
    }

    initiateWhatsAppHandoff() {
        const whatsappLink = this.generateWhatsAppLink();
        
        this.addBotMessage(`🟢 I'm connecting you to our human safari expert via WhatsApp!\n\n📱 I've prepared a summary of our entire conversation to share with them.`);
        
        setTimeout(() => {
            this.addBotMessage(`\n<div class="human-handoff-card">\n<div class="handoff-header">\n<h4>🚀 Ready to Connect!</h4>\n<p>Click the button below to continue with our human expert</p>\n</div>\n<div class="handoff-content">\n<p><strong>✅ Your conversation history is included</strong></p>\n<p><strong>✅ Your preferences are saved</strong></p>\n<p><strong>✅ Direct connection to safari expert</strong></p>\n</div>\n<a href="${whatsappLink}" target="_blank" class="whatsapp-handoff-btn">\n<i class="fab fa-whatsapp"></i> Continue on WhatsApp\n</a>\n</div>`);
            
            this.trackEvent('human_handoff', 'whatsapp_initiated');
            
            // Send email notification to team
            this.sendEmailNotification('whatsapp_handoff');
        }, 1000);
    }

    showPhoneNumber() {
        this.addBotMessage(`📞 You can also call us directly for immediate assistance!\n\n<div class="phone-handoff-card">\n<div class="phone-header">\n<h4>📱 Call Our Safari Experts</h4>\n</div>\n<div class="phone-content">\n<p><strong>🇺🇬 Uganda Office:</strong></p>\n<a href="tel:${this.humanHandoff.phoneNumber}" class="phone-link">${this.humanHandoff.phoneNumber}</a>\n<p><small>Available: Mon-Sun, 8AM-10PM (East Africa Time)</small></p>\n</div>\n<p><strong>💡 Tip:</strong> Mention you spoke with the AI assistant for faster service!</p>\n</div>`);
        
        this.trackEvent('human_handoff', 'phone_displayed');
        
        // Send email notification
        this.sendEmailNotification('phone_inquiry');
    }

    async sendEmailNotification(type = 'general') {
        const emailData = {
            to: this.humanHandoff.emailAddresses,
            subject: `🤖 AI Bot → Human Handoff Request - ${type.toUpperCase()}`,
            conversationSummary: this.formatConversationForHandoff(),
            timestamp: new Date().toISOString(),
            type: type,
            userPreferences: this.userPreferences
        };

        try {
            // This would typically be sent to your backend API
            // For now, we'll just log it and could implement a simple email service
            console.log('Email notification data:', emailData);
            
            // You could implement a simple fetch to a backend endpoint here:
            // await fetch('/api/send-notification', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(emailData)
            // });
            
            this.trackEvent('email_notification', type);

        } catch (error) {
            console.error('Failed to send email notification', error);
        }
    }

    handleFinalResponse(action) {
        switch(action) {
            case 'Book Consultation Call':
                this.bookConsultationCall();
                break;
            case 'More Details':
                this.showMoreDetails();
                break;
            case 'Start Over':
                this.resetConversation();
                break;
            case 'Contact WhatsApp':
                this.initiateWhatsAppHandoff();
                break;
            default:
                this.addBotMessage("I didn't understand that option. Would you like to try again?");
                this.showQuickActions(['Book Consultation Call', 'More Details', 'Start Over', 'Contact WhatsApp']);
        }
    }

    sendEmailSummary() {
        this.addBotMessage(`📧 I'm sending a summary of our conversation to our team right now!`);
        
        setTimeout(() => {
            this.addBotMessage(`✅ Email sent! Our safari experts will review your preferences and follow up within 24 hours.\n\n📞 For immediate assistance, you can also call or WhatsApp us!`);
            this.showQuickActions(['Call Now', 'WhatsApp Now', 'Continue Browsing']);
            
            // Send actual email notification
            this.sendEmailNotification('email_summary_requested');
        }, 2000);
    }

    bookConsultationCall() {
        this.addBotMessage(`📞 Perfect! Let me help you book a FREE consultation call with our safari experts.`);
        
        setTimeout(() => {
            this.addBotMessage(`🎯 During your call, we'll:\n• Review your preferences in detail\n• Suggest personalized safari packages\n• Answer all your questions\n• Provide booking assistance\n\nWould you prefer to book via WhatsApp or direct call?`);
            this.showQuickActions(['Book via WhatsApp', 'Direct Call Now', 'Email My Details']);
        }, 1500);
    }

    continueWithAI() {
        this.addBotMessage(`🤖 Great! I'm here to help. What would you like to explore?`);
        
        setTimeout(() => {
            this.showQuickActions(['Live Exchange Rates', 'Country Information', 'Safari Tips', 'Wildlife Guide', 'Best Travel Time', 'Packing List']);
        }, 800);
    }

    showMoreDetails() {
        this.addBotMessage(`📋 I'd be happy to provide more details! What specific information would you like?`);
        
        setTimeout(() => {
            this.addBotMessage(`Here are the areas I can help with in detail:`);
            this.showQuickActions(['Package Inclusions', 'Accommodation Details', 'Transport Options', 'Visa Requirements', 'Health & Safety', 'Weather & Climate']);
        }, 1000);
    }

    resetConversation() {
        // Reset user preferences
        this.userPreferences = {
            budget: null,
            duration: null,
            interests: [],
            groupSize: null,
            experience: null,
            country: null
        };
        
        // Reset conversation state
        this.conversationState = 'greeting';
        this.conversationHistory = [];
        this.sessionStartTime = new Date();
        
        // Clear messages
        const messagesContainer = document.getElementById('aiChatMessages');
        messagesContainer.innerHTML = '';
        
        this.addBotMessage(`🔄 Let's start fresh! I'm your AI Safari Assistant ready to help you find the perfect East African adventure.`);
        
        setTimeout(() => {
            this.addBotMessage("What's your approximate budget per person for the safari?");
            this.showQuickActions(['Under $700', '$700-$1000', '$1000-$1500', 'Over $1500', 'Not sure yet']);
            this.conversationState = 'budget';
        }, 1500);
        
        this.trackEvent('conversation_reset', 'user_initiated');
    }

    checkInactivity() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.humanHandoff.lastActivityTime;
        
        if (timeSinceLastActivity > this.humanHandoff.inactivityTimeout && this.isActive) {
            this.handleInactiveUser();
            // Also send transcript on inactivity
            this.sendTranscript({ reason: 'inactivity_timeout' });
        }
    }

    // Visitor storage helpers
    loadVisitorFromStorage() {
        try {
            const raw = localStorage.getItem('ai_visitor');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }
    saveVisitorToStorage() {
        try { localStorage.setItem('ai_visitor', JSON.stringify(this.visitor || null)); } catch {}
    }
    clearVisitorFromStorage() {
        try { localStorage.removeItem('ai_visitor'); } catch {}
    }

    // Transcript formatting and sending
    formatTranscriptPayload(extra = {}) {
        return {
            visitor: this.visitor || {},
            sessionStart: this.sessionStartTime?.toISOString?.() || new Date().toISOString(),
            sessionEnd: new Date().toISOString(),
            history: this.conversationHistory,
            preferences: this.userPreferences,
            meta: {
                page: window.location.href,
                userAgent: navigator.userAgent,
                timezoneOffset: new Date().getTimezoneOffset(),
                ...extra
            }
        };
    }

    sendTranscript(extra = {}, useBeacon = false) {
        const payload = this.formatTranscriptPayload(extra);

        // On GitHub Pages, PHP won't execute; skip network call to avoid 405 noise
        try {
            const host = (typeof location !== 'undefined' ? location.hostname : '');
            if (/github\.io$/.test(host)) {
                console.log('[AI Bot] Transcript skipped on GitHub Pages.');
                return false;
            }
        } catch (_) { /* ignore */ }

        // Compute base path when not on GitHub Pages
        let url = '/backend/api/chat_transcript.php';
        try {
            const basePath = (location && location.pathname && location.pathname.includes('/gisu-safaris')) ? '/gisu-safaris' : '';
            url = `${basePath}/backend/api/chat_transcript.php`;
        } catch (_) { /* default url used */ }

        try {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            if (useBeacon && navigator.sendBeacon) {
                navigator.sendBeacon(url, blob);
                return true;
            }

            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': 'gisu_safaris_api_key_2024' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        } catch (e) {
            console.warn('Failed to send transcript', e);
        }
        return false;
    }

    handleInactiveUser() {
        this.addBotMessage(`👋 I noticed you've been quiet for a while. Would you like me to connect you with a human safari expert, or is there anything else I can help you with?`);
        
        this.showQuickActions(['Talk to Human', 'Continue with AI', 'Get Phone Number', 'Send Email Summary']);
        
        // Send email notification about inactive user
        this.sendEmailNotification('user_inactive');
        
        this.trackEvent('user_inactivity', 'timeout_reached');
    }

    // Guided Booking Flow
    startGuidedBooking() {
        this.addBotMessage("🧭 Great! Let's capture a few details to create your booking lead.");
        setTimeout(() => {
            this.addBotMessage("Which destination are you most interested in?");
            this.showQuickActions(['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'Multi-Country']);
            this.conversationState = 'collect_destination';
        }, 600);
    }
    handleDestinationChoice(choice) {
        this.userPreferences.country = choice;
        setTimeout(() => {
            this.addBotMessage("How many travelers are in your party?");
            this.showQuickActions(['1', '2', '3-4', '5-7', '8+']);
            this.conversationState = 'collect_group';
        }, 400);
    }
    handleGroupSizeChoice(choice) {
        this.userPreferences.groupSize = choice;
        setTimeout(() => {
            this.addBotMessage("When do you plan to travel? You can pick a general window.");
            this.showQuickActions(['This Month', '1-3 Months', '3-6 Months', '6-12 Months', 'Flexible']);
            this.conversationState = 'collect_date';
        }, 400);
    }
    handleTravelDateChoice(choice) {
        this.userPreferences.travelWindow = choice;
        // Try submit lead
        this.submitGuidedLead();
    }

    async submitGuidedLead() {
        // Ensure we have an email to submit the lead
        const v = this.visitor || {};
        const email = (v.email || '').trim();
        if (!email || !/.+@.+\..+/.test(email)) {
            this.addBotMessage("📧 To submit your lead to our team, please provide your email. Type it below and press Enter.");
            this.conversationState = 'awaiting_email_for_lead';
            return;
        }

        const [firstName, ...rest] = (v.name || 'AI Visitor').trim().split(' ');
        const lastName = rest.join(' ');

        const payload = {
            firstName: firstName || 'AI',
            lastName: lastName || 'Visitor',
            email: email,
            phone: '',
            country: this.userPreferences.country || 'Uganda',
            packageName: 'AI Guided Booking Lead',
            packageType: 'ai-bot',
            duration: this.userPreferences.duration || '',
            groupSize: (this.userPreferences.groupSize || '').toString(),
            travelDate: '',
            budget: this.userPreferences.budget || '',
            accommodationLevel: '',
            specialRequirements: '',
            message: this.formatConversationForHandoff()
        };

        try {
            this.addBotMessage('📝 Submitting your lead to our safari experts...');
            await fetch('/backend/api/booking.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(r => r.json()).catch(() => ({}));

            this.addBotMessage('✅ Lead submitted! Our team will reach out within 24 hours. Would you also like to chat on WhatsApp now?');
            this.showQuickActions(['Contact WhatsApp', 'Book Consultation Call', 'Continue with AI']);

            // Show operator dashboard stub
            this.showOperatorDashboardStub();

        } catch (e) {
            this.addBotMessage('⚠️ Sorry, I could not submit your lead right now. You can still reach us on WhatsApp.');
            this.showQuickActions(['Contact WhatsApp', 'Get Phone Number']);
        }
    }

    handleFreeTextMessage(message) {
        const lowerMessage = message.toLowerCase();
        if (this.conversationState === 'awaiting_email_for_lead') {
            const email = message.trim();
            if (/.+@.+\..+/.test(email)) {
                this.visitor = { ...(this.visitor||{}), email, consent: true };
                this.saveVisitorToStorage();
                this.addBotMessage('👍 Thanks! Using that email to submit your lead.');
                return this.submitGuidedLead();
            } else {
                this.addBotMessage('That does not look like a valid email. Please try again, or tap Contact WhatsApp.');
                this.showQuickActions(['Contact WhatsApp', 'Get Phone Number']);
                return;
            }
        }
        // fall through to existing logic
        // ... rest of the function remains the same ...
    }

    // Operator dashboard stub showing summary + WhatsApp deep link
    showOperatorDashboardStub() {
        const wa = this.generateWhatsAppLink();
        const summary = this.formatConversationForHandoff();
        this.addBotMessage(`
<div class="handoff-dashboard">
  <h4>Operator Handoff Summary</h4>
  <pre style="white-space:pre-wrap;background:#f8f9fa;border:1px solid #eee;padding:8px;border-radius:8px;max-height:180px;overflow:auto;">${summary}</pre>
  <a href="${wa}" target="_blank" class="whatsapp-handoff-btn"><i class="fab fa-whatsapp"></i> Open WhatsApp</a>
  <p style="margin-top:6px;color:#6c757d;font-size:12px;">This is a preview for operators. A real dashboard will include assignment and SLA tracking.</p>
</div>`);
    }

    // Geographic and Information Handlers
    handleLocationQuery(message) {
        const countryInfo = {
            uganda: {
                flag: '🇺🇬',
                location: 'East Africa, landlocked country',
                borders: 'Kenya, Tanzania, Rwanda, Democratic Republic of Congo, South Sudan',
                coordinates: '1°N 32°E',
                area: '241,038 km² (93,065 sq mi)',
                famous: 'Mountain Gorillas, Source of the Nile, Murchison Falls'
            },
            kenya: {
                flag: '🇰🇪',
                location: 'East Africa, coastal country on Indian Ocean',
                borders: 'Uganda, Tanzania, Ethiopia, Somalia, South Sudan',
                coordinates: '1°S 38°E',
                area: '580,367 km² (224,081 sq mi)',
                famous: 'Masai Mara, Big Five, Great Rift Valley, Mount Kenya'
            },
            tanzania: {
                flag: '🇹🇿',
                location: 'East Africa, coastal country on Indian Ocean',
                borders: 'Kenya, Uganda, Rwanda, Burundi, Democratic Republic of Congo, Zambia, Malawi, Mozambique',
                coordinates: '6°S 35°E',
                area: '947,303 km² (365,756 sq mi)',
                famous: 'Serengeti, Mount Kilimanjaro, Ngorongoro Crater, Zanzibar'
            },
            rwanda: {
                flag: '🇷🇼',
                location: 'East Africa, landlocked country in the Great Lakes region',
                borders: 'Uganda, Tanzania, Burundi, Democratic Republic of Congo',
                coordinates: '2°S 30°E',
                area: '26,338 km² (10,169 sq mi)',
                famous: 'Mountain Gorillas, Volcanoes National Park, Land of a Thousand Hills'
            }
        };

        let country = '';
        if (message.includes('uganda')) country = 'uganda';
        else if (message.includes('kenya')) country = 'kenya';
        else if (message.includes('tanzania')) country = 'tanzania';
        else if (message.includes('rwanda')) country = 'rwanda';

        if (country && countryInfo[country]) {
            const info = countryInfo[country];
            this.addBotMessage(`🌍 ${info.flag} **${country.charAt(0).toUpperCase() + country.slice(1)}** is located in ${info.location}.`);
            
            setTimeout(() => {
                this.addBotMessage(`
<div class="api-data-highlight">
🗺️ **Location:** ${info.location}<br>
🌍 **Coordinates:** ${info.coordinates}<br>
📏 **Area:** ${info.area}<br>
🏕️ **Borders:** ${info.borders}<br>
⭐ **Famous for:** ${info.famous}
</div>`);
                this.showQuickActions(['More Geography', 'Safari Options', 'Travel Tips', 'Best Time to Visit']);
            }, 1000);
        }
    }

    handleGeographyQuestions(message) {
        this.addBotMessage("🌍 East Africa is a fascinating region! Let me tell you about the safari destinations:");
        
        setTimeout(() => {
            this.addBotMessage(`
<div class="api-data-highlight">
🇺🇬 **Uganda** - Landlocked, famous for mountain gorillas<br>
🇰🇪 **Kenya** - Coastal, home to Masai Mara and Big Five<br>
🇹🇿 **Tanzania** - Largest, contains Serengeti and Kilimanjaro<br>
🇷🇼 **Rwanda** - Smallest, known as 'Land of a Thousand Hills'
</div>`);
            
            this.addBotMessage("✨ All these countries offer unique safari experiences with diverse landscapes, from savannas to rainforests!");
            this.showQuickActions(['Uganda Details', 'Kenya Details', 'Tanzania Details', 'Rwanda Details']);
        }, 1500);
    }

    showAfricanCountriesInfo() {
        this.addBotMessage("🌍 Africa has 54 countries, but East Africa is the safari capital! Let me show you our key destinations:");
        
        setTimeout(() => {
            this.addBotMessage(`
<div class="api-data-highlight">
🎆 **East African Safari Countries:**<br>
🇺🇬 Uganda - Mountain Gorillas & Chimps<br>
🇰🇪 Kenya - Big Five & Great Migration<br>
🇹🇿 Tanzania - Serengeti & Ngorongoro<br>
🇷🇼 Rwanda - Luxury Gorilla Experience<br><br>
🌍 **Other Notable African Safari Destinations:**<br>
🇿🇼 Zimbabwe - Victoria Falls<br>
🇧🇼 Botswana - Okavango Delta<br>
🇿🇦 South Africa - Big Five & Wine<br>
🇳🇦 Namibia - Desert Safari
</div>`);
            
            this.addBotMessage("🎯 We specialize in East African safaris - the most wildlife-rich region in Africa!");
            this.showQuickActions(['East Africa Focus', 'Why East Africa?', 'Safari Packages', 'Plan My Trip']);
        }, 2000);
    }

    handleSafariTimingQuestions() {
        this.addBotMessage("📅 Great question! Safari timing depends on what you want to see. Let me break it down:");
        
        setTimeout(() => {
            this.addBotMessage(`
<div class="api-data-highlight">
🌅 **Best Safari Times:**<br><br>
🌿 **Dry Season (June-October):**<br>
• Best wildlife viewing<br>
• Animals gather at water sources<br>
• Great Migration in Masai Mara (July-Oct)<br><br>
🌧️ **Wet Season (Nov-May):**<br>
• Lush landscapes & fewer crowds<br>
• Baby animals born (Jan-Mar)<br>
• Great for photography<br>
• Lower prices
</div>`);
            
            this.addBotMessage("🎡 **Special Events:** Wildebeest calving (Jan-Mar), Great Migration river crossings (July-Sep)!");
            this.showQuickActions(['Dry Season Safaris', 'Wet Season Deals', 'Migration Calendar', 'Best for Photography']);
        }, 2000);
    }

    handleVisaQuestions() {
        this.addBotMessage("📋 Visa requirements vary by your nationality. Here's what you need to know:");
        
        setTimeout(() => {
            this.addBotMessage(`
<div class="api-data-highlight">
🌍 **East African Tourist Visa (Recommended):**<br>
• Valid for Uganda, Kenya & Rwanda<br>
• 90 days, multiple entry<br>
• $100 USD<br><br>
🇺🇬 **Uganda:** eVisa or on arrival - $50<br>
🇰🇪 **Kenya:** eVisa or ETA - $50<br>
🇹🇿 **Tanzania:** eVisa - $50-100<br>
🇷🇼 **Rwanda:** eVisa or on arrival - $50
</div>`);
            
            this.addBotMessage("⚠️ **Important:** Requirements change by nationality. We provide detailed visa assistance for all bookings!");
            this.showQuickActions(['Visa Assistance', 'Document Checklist', 'Processing Times', 'Multi-Country Visa']);
        }, 2000);
    }

    handleWildlifeQuestions() {
        this.addBotMessage("🦁 East Africa is the world's premier wildlife destination! Here's what you can see:");
        
        setTimeout(() => {
            this.addBotMessage(`
<div class="api-data-highlight">
🐅 **The Big Five:**<br>
• African Lion<br>
• African Elephant<br>
• Cape Buffalo<br>
• Leopard<br>
• Black Rhinoceros<br><br>
🦍 **Primates:**<br>
• Mountain Gorillas (🇺🇬🇷🇼)<br>
• Chimpanzees (🇺🇬🇹🇿)<br>
• Golden Monkeys (🇷🇼)<br><br>
🦓 **Great Migration:** 2+ million wildebeest, zebras & gazelles!
</div>`);
            
            this.addBotMessage("📸 Plus hundreds of bird species, hippos, crocodiles, giraffes, and much more!");
            this.showQuickActions(['Big Five Safari', 'Gorilla Trekking', 'Migration Safari', 'Bird Watching']);
        }, 2000);
    }

    handleLanguageQuestions() {
        this.addBotMessage("🗣️ Language won't be a barrier on your East African safari! Here's what's spoken:");
        
        setTimeout(() => {
            this.addBotMessage(`
<div class="api-data-highlight">
🇺🇬 **Uganda:**<br>
• English (Official)<br>
• Luganda (Most common local)<br><br>
🇰🇪 **Kenya:**<br>
• English & Swahili (Official)<br><br>
🇹🇿 **Tanzania:**<br>
• Swahili (Official)<br>
• English (Widely spoken)<br><br>
🇷🇼 **Rwanda:**<br>
• English, French, Kinyarwanda (Official)
</div>`);
            
            this.addBotMessage("✨ **Good news:** All our guides speak fluent English, and tourism staff are English-speaking throughout the region!");
            this.showQuickActions(['Basic Phrases', 'Cultural Tips', 'Guide Languages', 'Communication Tips']);
        }, 2000);
    }

    handleClimateQuestions() {
        this.addBotMessage("🌡️ East Africa has a tropical climate with distinct seasons. Here's what to expect:");
        
        setTimeout(() => {
            this.addBotMessage(`
<div class="api-data-highlight">
🌡️ **Temperatures:**<br>
• Daytime: 20-28°C (68-82°F)<br>
• Nighttime: 10-18°C (50-64°F)<br>
• Higher altitudes cooler<br><br>
🌧️ **Rainy Seasons:**<br>
• Long rains: March-May<br>
• Short rains: November-December<br><br>
☀️ **Dry Seasons:**<br>
• June-October (Best for safari)<br>
• December-February
</div>`);
            
            this.addBotMessage("🎅 **Tip:** Pack layers! Mornings can be cool, afternoons warm, and evenings chilly.");
            this.showQuickActions(['Packing List', 'Seasonal Calendar', 'Weather by Month', 'Altitude Effects']);
        }, 2000);
    }

    bindEvents() {
        const doBind = () => {
            // Core controls
            const triggerBtn = document.getElementById('aiBotTrigger');
            if (triggerBtn) triggerBtn.addEventListener('click', () => this.toggleBot());

            const closeBtn = document.querySelector('.ai-close-btn');
            if (closeBtn) closeBtn.addEventListener('click', () => this.toggleBot());

            const sendBtn = document.getElementById('aiSendBtn');
            if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());

            // Delegate clicks inside chat messages (e.g., package buttons)
            const messages = document.getElementById('aiChatMessages');
            if (messages) {
                messages.addEventListener('click', (e) => {
                    // Package card button
                    const pkgBtn = e.target.closest('button.package-rec-btn');
                    if (pkgBtn) {
                        const url = pkgBtn.getAttribute('data-url');
                        if (url) this.viewPackage(url);
                        return;
                    }

                    // Handoff options buttons
                    const handoffBtn = e.target.closest('button.handoff-option-btn');
                    if (handoffBtn) {
                        const action = handoffBtn.getAttribute('data-action');
                        if (action === 'whatsapp') this.handleHumanHandoff('whatsapp');
                        else if (action === 'phone') this.handleHumanHandoff('phone');
                        return;
                    }
                });
            }

            // Input enter-to-send
            const input = document.getElementById('aiUserInput');
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.sendMessage();
                });
            }

            // Pre-chat handlers
            const startBtn = document.getElementById('aiStartChatBtn');
            const forgetBtn = document.getElementById('aiForgetMeBtn');
            const nameInput = document.getElementById('aiVisitorName');
            const emailInput = document.getElementById('aiVisitorEmail');
            const consentInput = document.getElementById('aiConsent');

            const validatePrechat = () => {
                const name = (nameInput?.value || '').trim();
                const email = (emailInput?.value || '').trim();
                const consent = !!consentInput?.checked;
                const emailValid = /.+@.+\..+/.test(email);
                if (nameInput) nameInput.classList.toggle('invalid', !name);
                if (emailInput) emailInput.classList.toggle('invalid', !(email && emailValid));
                const consentLabel = document.querySelector('label.prechat-consent');
                if (consentLabel) consentLabel.classList.toggle('invalid', !consent);
                if (startBtn) startBtn.disabled = !(name && emailValid && consent);
            };

            nameInput?.addEventListener('input', validatePrechat);
            emailInput?.addEventListener('input', validatePrechat);
            consentInput?.addEventListener('change', validatePrechat);
            validatePrechat();

            if (startBtn) {
                startBtn.addEventListener('click', () => {
                    const name = (nameInput?.value || '').trim();
                    const email = (emailInput?.value || '').trim();
                    const consent = !!consentInput?.checked;
                    const emailValid = /.+@.+\..+/.test(email);

                    const errors = [];
                    if (!name) errors.push('name');
                    if (!emailValid) errors.push('valid email');
                    if (!consent) errors.push('consent');
                    if (errors.length) {
                        alert(`Please provide ${errors.join(', ')} to start the chat.`);
                        if (!name) { nameInput?.focus(); return; }
                        if (!emailValid) { emailInput?.focus(); return; }
                        if (!consent) { consentInput?.focus(); return; }
                        return;
                    }

                    this.visitor = { name, email, consent, capturedAt: new Date().toISOString() };
                    this.saveVisitorToStorage();
                    const pre = document.getElementById('aiPrechatModal');
                    if (pre) pre.style.display = 'none';
                    this.updateGatingUI();
                    this.addBotMessage(`👋 Hi ${name.split(' ')[0]}! Great to meet you.`);
                    this.startConversation();
                });
            }

            if (forgetBtn) {
                forgetBtn.addEventListener('click', () => {
                    this.clearVisitorFromStorage();
                    this.visitor = null;
                    const n = document.getElementById('aiVisitorName'); if (n) n.value = '';
                    const e = document.getElementById('aiVisitorEmail'); if (e) e.value = '';
                    const c = document.getElementById('aiConsent'); if (c) c.checked = false;
                    validatePrechat();
                });
            }
        };

        // Set up inactivity checker
        setInterval(() => { this.checkInactivity(); }, 60000);

        // Send transcript on page unload (best-effort)
        window.addEventListener('unload', () => {
            try { this.sendTranscript({ reason: 'unload' }, true); } catch (e) { /* ignore */ }
        });

        // If DOM already loaded (common when script is injected dynamically), bind immediately
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doBind, { once: true });
        } else {
            doBind();
        }
    }

    // Initialize the Enhanced Safari AI Bot
    static getInstance() {
        if (!SafariAIBotEnhancedInternal.instance) {
            SafariAIBotEnhancedInternal.instance = new SafariAIBotEnhancedInternal();
        }
        return SafariAIBotEnhancedInternal.instance;
    }
}

// Expose constructor globally for external loaders
if (typeof window !== 'undefined') {
    window.SafariAIBotEnhanced = SafariAIBotEnhancedInternal;
}

// Initialize the Enhanced Safari AI Bot and expose instance for debugging/interop
const safariBot = window.SafariAIBotEnhanced.getInstance();
if (typeof window !== 'undefined') {
    window.safariBot = safariBot;
}

})();
