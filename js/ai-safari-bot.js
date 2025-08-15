// AI-Powered Safari Package Recommendation System
class SafariAIBot {
    constructor() {
        this.isActive = false;
        this.conversationState = 'greeting';
        this.userPreferences = {
            budget: null,
            duration: null,
            interests: [],
            groupSize: null,
            experience: null,
            country: null
        };
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
        this.createAIWidget();
        this.bindEvents();
    }

    createAIWidget() {
        const aiWidget = document.createElement('div');
        aiWidget.id = 'ai-safari-bot';
        aiWidget.innerHTML = `
            <div class="ai-bot-container">
                <!-- AI Bot Button -->
                <button class="ai-bot-trigger" id="aiBotTrigger" onclick="safariBot.toggleBot()">
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
                            <small>Powered by Gisu Safaris Intelligence</small>
                        </div>
                        <button class="ai-close-btn" onclick="safariBot.toggleBot()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="ai-chat-messages" id="aiChatMessages">
                        <!-- Messages will be populated here -->
                    </div>
                    
                    <div class="ai-quick-actions" id="aiQuickActions">
                        <!-- Quick action buttons will appear here -->
                    </div>
                    
                    <div class="ai-input-area">
                        <input type="text" id="aiUserInput" placeholder="Type your message..." maxlength="200">
                        <button id="aiSendBtn" onclick="safariBot.sendMessage()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(aiWidget);
        this.addAIStyles();
    }

    addAIStyles() {
        const styles = document.createElement('style');
        styles.innerHTML = `
            /* AI Safari Bot Styles */
            #ai-safari-bot {
                position: fixed;
                bottom: 100px;
                left: 20px;
                z-index: 2147483647;
                font-family: 'Poppins', sans-serif;
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
                bottom: 80px;
                left: 0;
                width: 320px;
                height: 380px;
                background: white;
                border-radius: 20px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
                animation: slideInUp 0.3s ease;
                z-index: 2147483646;
            }

            @keyframes slideInUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .ai-chat-window.active {
                display: flex;
            }

            .ai-chat-header {
                background: linear-gradient(135deg, #2E7D32, #4CAF50);
                color: white;
                padding: 5px;
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
                padding: -1px 15px;
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
                padding: 9px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 8px;
                margin-right: 182px;
            }

            #aiUserInput {
                flex: 1;
                border: 1px solid #ddd;
                border-radius: 20px;
                /* padding: 1px 10px; */
                font-size: 14px;
                outline: none;
                margin-right: 37px;
               
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
                justify-content: between;
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

            /* Mobile Responsive */
            @media (max-width: 768px) {
                #ai-safari-bot {
                    left: 15px;
                    bottom: 90px;
                }
                
                .ai-chat-window {
                    width: 300px;
                    height: 350px;
                }
                
                .ai-bot-trigger {
                    width: 60px;
                    height: 60px;
                }
                
                .ai-bot-icon {
                    font-size: 20px;
                }
            }
        `;
        document.head.appendChild(styles);
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
            this.startConversation();
        }
    }

    startConversation() {
        if (this.conversationState === 'greeting') {
            this.addBotMessage("👋 Hi! I'm your AI Safari Assistant. I'll help you find the perfect East Africa safari package based on your preferences!");
            
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
    }

    addUserMessage(message) {
        const messagesContainer = document.getElementById('aiChatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'ai-message user';
        messageDiv.textContent = message;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    showQuickActions(actions) {
        const actionsContainer = document.getElementById('aiQuickActions');
        actionsContainer.innerHTML = '';
        
        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            btn.textContent = action;
            btn.onclick = () => this.handleQuickAction(action);
            actionsContainer.appendChild(btn);
        });
    }

    handleQuickAction(action) {
        this.addUserMessage(action);
        document.getElementById('aiQuickActions').innerHTML = '';
        
        switch(this.conversationState) {
            case 'budget':
                this.handleBudgetResponse(action);
                break;
            case 'duration':
                this.handleDurationResponse(action);
                break;
            case 'interests':
                this.handleInterestsResponse(action);
                break;
            case 'experience':
                this.handleExperienceResponse(action);
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
        
        // Allow multiple selections
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
            this.addBotMessage("Would you like more details about any of these packages, or shall I help you book a FREE consultation call?");
            this.showQuickActions(['Book Consultation Call', 'More Details', 'Start Over', 'Contact WhatsApp']);
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
                <button class="package-rec-btn" onclick="safariBot.viewPackage('${pkg.url}')">
                    View Details & Book
                </button>
            </div>
        `;
        
        messagesContainer.appendChild(recDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    viewPackage(url) {
        // Track the click
        this.trackEvent('package_view', url);
        // Open package page
        window.open(url, '_blank');
    }

    sendMessage() {
        const input = document.getElementById('aiUserInput');
        const message = input.value.trim();
        
        if (message) {
            this.addUserMessage(message);
            input.value = '';
            
            // Simple AI responses for free text
            setTimeout(() => {
                this.handleFreeTextMessage(message);
            }, 800);
        }
    }

    handleFreeTextMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // Comprehensive African Safari & Travel Knowledge Base
        if (lowerMessage.includes('book') || lowerMessage.includes('consultation') || lowerMessage.includes('reserve')) {
            this.addBotMessage("🎯 Perfect! I'll help you book your dream safari. We offer:");
            this.addBotMessage("✅ FREE consultation call (30 minutes)\u003cbr\u003e✅ Custom itinerary planning\u003cbr\u003e✅ Best price guarantee\u003cbr\u003e✅ 24/7 support during your trip");
            this.showQuickActions(['Book Free Call', 'WhatsApp Now', 'Email Quote', 'View Packages']);
        
        } else if (lowerMessage.includes('gisu') || lowerMessage.includes('why gisu') || lowerMessage.includes('company')) {
            this.addBotMessage("🌟 Why Choose Gisu Safaris?");
            this.addBotMessage("🏆 Leading East African Safari Expert since 2015\u003cbr\u003e🎓 Local guides with 15+ years experience\u003cbr\u003e⭐ 4.9/5 rating from 2000+ travelers\u003cbr\u003e🌍 Eco-friendly & community-focused tourism");
            this.addBotMessage("💰 Best Value Promise: We beat any competitor's price\u003cbr\u003e🚨 Emergency support 24/7 during your safari\u003cbr\u003e🏅 Licensed by all East African tourism boards");
            this.showQuickActions(['Our Reviews', 'Local Impact', 'Price Match', 'Meet Our Team']);
        
        } else if (lowerMessage.includes('president') || lowerMessage.includes('leader') || lowerMessage.includes('government')) {
            this.addBotMessage("🏛️ East African Leaders (2024):");
            this.addBotMessage("🇺🇬 Uganda: Yoweri Museveni (President since 1986)\u003cbr\u003e🇰🇪 Kenya: William Ruto (President since 2022)\u003cbr\u003e🇹🇿 Tanzania: Samia Suluhu Hassan (President since 2021)\u003cbr\u003e🇷🇼 Rwanda: Paul Kagame (President since 2000)");
            this.addBotMessage("All countries have stable governments focused on tourism development and wildlife conservation!");
            this.showQuickActions(['Political Stability', 'Tourism Policies', 'Safety Record']);
        
        } else if (lowerMessage.includes('population') || lowerMessage.includes('people') || lowerMessage.includes('demographics')) {
            this.addBotMessage("👥 East African Populations (2024):");
            this.addBotMessage("🇺🇬 Uganda: 48.6 million (youngest population globally)\u003cbr\u003e🇰🇪 Kenya: 55.1 million (diverse, business hub)\u003cbr\u003e🇹🇿 Tanzania: 63.6 million (largest in East Africa)\u003cbr\u003e🇷🇼 Rwanda: 13.8 million (most densely populated)");
            this.addBotMessage("💡 Total East Africa: 181+ million people\u003cbr\u003e🌍 Africa total: 1.4 billion (18% of world population)");
            this.showQuickActions(['Youth Demographics', 'Cultural Diversity', 'Economic Growth']);
        
        } else if (lowerMessage.includes('exchange') || lowerMessage.includes('rate') || lowerMessage.includes('dollar') || lowerMessage.includes('usd')) {
            this.addBotMessage("💱 Current Exchange Rates (August 2025):");
            this.addBotMessage("🇺🇬 1 USD = 3,750 UGX (Ugandan Shilling)\u003cbr\u003e🇰🇪 1 USD = 142 KES (Kenyan Shilling)\u003cbr\u003e🇹🇿 1 USD = 2,485 TZS (Tanzanian Shilling)\u003cbr\u003e🇷🇼 1 USD = 1,315 RWF (Rwandan Franc)");
            this.addBotMessage("📈 Exchange rates fluctuate daily. For real-time rates, check XE.com or your bank's app before travel.");
            this.addBotMessage("💡 USD is widely accepted at lodges, airports, and tourist areas. ATMs available in cities. Credit cards accepted at most safari lodges.");
            this.showQuickActions(['Real-Time Rates', 'Currency Tips', 'ATM Locations', 'Payment Methods', 'Historical Rates']);
        
        } else if (lowerMessage.includes('tradition') || lowerMessage.includes('custom') || lowerMessage.includes('tribe') || lowerMessage.includes('ethnic')) {
            this.addBotMessage("🎭 Rich African Cultures & Traditions:");
            this.addBotMessage("🇰🇪 Kenya: 44+ tribes, famous Masai warriors, beadwork\u003cbr\u003e🇺🇬 Uganda: Buganda Kingdom, Batwa pygmies, drumming\u003cbr\u003e🇹🇿 Tanzania: 120+ tribes, Hadza hunters, Makonde art\u003cbr\u003e🇷🇼 Rwanda: Unity culture, traditional dance, basket weaving");
            this.addBotMessage("🎨 Experience: Traditional dances, craft markets, village visits, storytelling, local cuisine!");
            this.showQuickActions(['Cultural Tours', 'Traditional Dances', 'Craft Markets', 'Village Visits']);
        
        } else if (lowerMessage.includes('economy') || lowerMessage.includes('gdp') || lowerMessage.includes('income') || lowerMessage.includes('business')) {
            this.addBotMessage("📈 East African Economies (2024):");
            this.addBotMessage("🇰🇪 Kenya: $115B GDP, financial hub, tech innovation\u003cbr\u003e🇹🇿 Tanzania: $78B GDP, mining, agriculture, tourism\u003cbr\u003e🇺🇬 Uganda: $48B GDP, oil discovery, coffee export\u003cbr\u003e🇷🇼 Rwanda: $13B GDP, fastest growing, business-friendly");
            this.addBotMessage("🚀 Tourism contributes 10-15% of GDP in each country. Safari industry employs 2+ million people directly!");
            this.showQuickActions(['Tourism Impact', 'Investment Climate', 'Growth Trends']);
        
        } else if (lowerMessage.includes('religion') || lowerMessage.includes('faith') || lowerMessage.includes('christian') || lowerMessage.includes('muslim')) {
            this.addBotMessage("⛪ East African Religions:");
            this.addBotMessage("🇺🇬 Uganda: 84% Christian, 14% Muslim, traditional\u003cbr\u003e🇰🇪 Kenya: 85% Christian, 11% Muslim, traditional\u003cbr\u003e🇹🇿 Tanzania: 61% Christian, 35% Muslim, traditional\u003cbr\u003e🇷🇼 Rwanda: 93% Christian, 2% Muslim, traditional");
            this.addBotMessage("🤝 Religious tolerance is strong. Many lodges accommodate different dietary and prayer needs!");
            this.showQuickActions(['Religious Sites', 'Dietary Needs', 'Cultural Respect']);
        
        } else if (lowerMessage.includes('capital') || lowerMessage.includes('city') || lowerMessage.includes('urban')) {
            this.addBotMessage("🏙️ East African Capital Cities:");
            this.addBotMessage("🇺🇬 Uganda: Kampala (1.7M people, built on 7 hills)\u003cbr\u003e🇰🇪 Kenya: Nairobi (4.4M people, 'Green City in the Sun')\u003cbr\u003e🇹🇿 Tanzania: Dodoma (official), Dar es Salaam (largest)\u003cbr\u003e🇷🇼 Rwanda: Kigali (1.1M people, cleanest city in Africa)");
            this.addBotMessage("✈️ Most safaris start from these cities - we arrange airport transfers and city tours!");
            this.showQuickActions(['City Tours', 'Airport Transfers', 'Urban Attractions']);
        
        } else if (lowerMessage.includes('food') || lowerMessage.includes('cuisine') || lowerMessage.includes('dish') || lowerMessage.includes('eat')) {
            this.addBotMessage("🍽️ Delicious East African Cuisine:");
            this.addBotMessage("🇺🇬 Uganda: Matooke (banana stew), posho, rolex wraps\u003cbr\u003e🇰🇪 Kenya: Nyama choma (grilled meat), ugali, samosas\u003cbr\u003e🇹🇿 Tanzania: Pilau rice, chapati, fresh seafood\u003cbr\u003e🇷🇼 Rwanda: Ibirayi (potatoes), inyama n'ubuki (honey meat)");
            this.addBotMessage("☕ Don't miss: Ugandan coffee, Kenyan tea, Ethiopian coffee ceremonies! Vegetarian/vegan options available everywhere.");
            this.showQuickActions(['Food Tours', 'Coffee Experiences', 'Vegetarian Options', 'Local Markets']);
        
        } else if (lowerMessage.includes('music') || lowerMessage.includes('dance') || lowerMessage.includes('art') || lowerMessage.includes('entertainment')) {
            this.addBotMessage("🎵 Vibrant African Arts & Entertainment:");
            this.addBotMessage("🥁 Music: Traditional drums, modern Afrobeat, gospel\u003cbr\u003e💃 Dance: Masai jumping, Rwandan Intore, Ugandan folk\u003cbr\u003e🎨 Arts: Makonde sculptures, Batik fabrics, beadwork\u003cbr\u003e📚 Stories: Oral traditions, folklore, modern literature");
            this.addBotMessage("🎪 Experience live performances at cultural centers and during village visits!");
            this.showQuickActions(['Cultural Shows', 'Art Markets', 'Music Venues', 'Dance Lessons']);
        
        } else if (lowerMessage.includes('independence') || lowerMessage.includes('history') || lowerMessage.includes('colonial')) {
            this.addBotMessage("🏛️ East African Independence History:");
            this.addBotMessage("🇰🇪 Kenya: Oct 12, 1963 (from Britain, led by Jomo Kenyatta)\u003cbr\u003e🇺🇬 Uganda: Oct 9, 1962 (from Britain, Milton Obote)\u003cbr\u003e🇹🇿 Tanzania: Dec 9, 1961 (Tanganyika + Zanzibar)\u003cbr\u003e🇷🇼 Rwanda: July 1, 1962 (from Belgium)");
            this.addBotMessage("🌍 All countries celebrate independence with national holidays, parades, and cultural festivals!");
            this.showQuickActions(['Historical Sites', 'Independence Museums', 'Colonial History']);
        
        } else if (lowerMessage.includes('wildlife') || lowerMessage.includes('animal') || lowerMessage.includes('conservation')) {
            this.addBotMessage("🦁 East Africa: The Wildlife Capital of the World!");
            this.addBotMessage("📊 Amazing Stats:\u003cbr\u003e• 70% of Africa's wildlife lives here\u003cbr\u003e• 2 million wildebeest migrate annually\u003cbr\u003e• Only 1,000 mountain gorillas exist (all here!)\u003cbr\u003e• 25,000+ elephants in Serengeti ecosystem");
            this.addBotMessage("🏞️ Protected Areas: 40+ national parks, 200+ conservancies. Your safari supports conservation and local communities!");
            this.showQuickActions(['Conservation Impact', 'Wildlife Stats', 'Protected Areas', 'Community Benefits']);
        
        } else if (lowerMessage.includes('education') || lowerMessage.includes('school') || lowerMessage.includes('university') || lowerMessage.includes('literacy')) {
            this.addBotMessage("🎓 Education in East Africa:");
            this.addBotMessage("📚 Literacy Rates (2024):\u003cbr\u003e🇷🇼 Rwanda: 73% (highest improvement)\u003cbr\u003e🇰🇪 Kenya: 82% (strong education system)\u003cbr\u003e🇹🇿 Tanzania: 78% (Swahili literature)\u003cbr\u003e🇺🇬 Uganda: 76% (free primary education)");
            this.addBotMessage("🏫 Many communities we visit have schools supported by tourism. Your safari helps fund education!");
            this.showQuickActions(['School Visits', 'Education Projects', 'Community Support']);
        
        } else if (lowerMessage.includes('technology') || lowerMessage.includes('mobile') || lowerMessage.includes('internet') || lowerMessage.includes('innovation')) {
            this.addBotMessage("📱 East Africa: Africa's Tech Hub!");
            this.addBotMessage("🚀 Tech Innovations:\u003cbr\u003e🇰🇪 Kenya: M-Pesa mobile money (world's first)\u003cbr\u003e🇷🇼 Rwanda: Drone delivery, cashless economy\u003cbr\u003e🇺🇬 Uganda: Growing fintech, mobile banking\u003cbr\u003e🇹🇿 Tanzania: E-government, mobile services");
            this.addBotMessage("📶 Internet: 4G available in cities, WiFi at most lodges. Mobile money widely used!");
            this.showQuickActions(['Mobile Money', 'Tech Tours', 'Internet Access']);
        
        } else if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
            this.addBotMessage("💰 Our safari prices vary by destination and luxury level:");
            this.addBotMessage("🇺🇬 Uganda: $650-$1,200 (Best value for gorillas)<br>🇰🇪 Kenya: $750-$1,500 (Big Five & Masai Mara)<br>🇹🇿 Tanzania: $950-$2,200 (Great Migration)<br>🇷🇼 Rwanda: $850-$1,800 (Luxury gorilla experience)");
            this.showQuickActions(['Budget Options', 'Luxury Packages', 'Get Custom Quote']);
        
        } else if (lowerMessage.includes('gorilla') || lowerMessage.includes('mountain gorilla')) {
            this.addBotMessage("🦍 Mountain Gorilla Trekking - Our #1 Experience!");
            this.addBotMessage("Did you know there are only 1,000 mountain gorillas left in the world? We offer gorilla trekking in:");
            this.addBotMessage("🇺🇬 Uganda (Bwindi & Mgahinga): $700 permit + accommodation<br>🇷🇼 Rwanda (Volcanoes NP): $1,500 permit + luxury lodges");
            this.addBotMessage("Uganda offers better value and longer encounters, while Rwanda provides easier access and luxury. Which interests you more?");
            this.showQuickActions(['Uganda Gorillas', 'Rwanda Gorillas', 'Compare Both', 'Gorilla Facts']);
        
        } else if (lowerMessage.includes('big five') || lowerMessage.includes('lion') || lowerMessage.includes('elephant') || lowerMessage.includes('leopard') || lowerMessage.includes('rhino') || lowerMessage.includes('buffalo')) {
            this.addBotMessage("🦁 Big Five Safari Adventures!");
            this.addBotMessage("The Big Five (lion, elephant, leopard, rhino, buffalo) can be seen in:");
            this.addBotMessage("🇰🇪 Kenya: Masai Mara (95% Big Five success rate)<br>🇺🇬 Uganda: Queen Elizabeth & Murchison Falls<br>🇹🇿 Tanzania: Serengeti & Ngorongoro Crater");
            this.addBotMessage("Best time for Big Five: June-October (dry season). Which country interests you most?");
            this.showQuickActions(['Kenya Big Five', 'Tanzania Safari', 'Uganda Wildlife', 'Best Times']);
        
        } else if (lowerMessage.includes('migration') || lowerMessage.includes('wildebeest') || lowerMessage.includes('serengeti')) {
            this.addBotMessage("🦓 The Great Migration - Nature's Greatest Show!");
            this.addBotMessage("2 million wildebeest, 200,000 zebras, and 300,000 gazelles migrate annually between Tanzania and Kenya.");
            this.addBotMessage("📅 Migration Calendar:<br>Jan-Mar: Calving season (Southern Serengeti)<br>Apr-Jun: Moving north<br>Jul-Oct: River crossings (Mara River)<br>Nov-Dec: Heading south");
            this.showQuickActions(['Book Migration Safari', 'Best Viewing Times', 'River Crossings', 'Tanzania vs Kenya']);
        
        } else if (lowerMessage.includes('when') || lowerMessage.includes('best time') || lowerMessage.includes('season') || lowerMessage.includes('weather')) {
            this.addBotMessage("🌤️ Best Times to Visit East Africa:");
            this.addBotMessage("🏆 PEAK SEASON (Jun-Oct & Dec-Jan):<br>• Dry weather, excellent wildlife viewing<br>• Great Migration river crossings<br>• Higher prices, crowded parks");
            this.addBotMessage("💡 SHOULDER SEASON (Feb-May & Nov):<br>• Lower prices, fewer crowds<br>• Some rain but still great wildlife<br>• Perfect for photography");
            this.showQuickActions(['June-October', 'November-May', 'Weather Details', 'Packing List']);
        
        } else if (lowerMessage.includes('safety') || lowerMessage.includes('safe') || lowerMessage.includes('security')) {
            this.addBotMessage("🛡️ Safari Safety - Our Top Priority!");
            this.addBotMessage("East Africa is very safe for tourism. We ensure:");
            this.addBotMessage("✅ Professional guides with 10+ years experience<br>✅ Well-maintained 4x4 safari vehicles<br>✅ 24/7 emergency support<br>✅ Comprehensive travel insurance<br>✅ Safety briefings before activities");
            this.addBotMessage("Uganda, Rwanda, Kenya, and Tanzania are all politically stable with strong tourism industries.");
            this.showQuickActions(['Safety Measures', 'Travel Insurance', 'Emergency Support']);
        
        } else if (lowerMessage.includes('visa') || lowerMessage.includes('passport') || lowerMessage.includes('requirements')) {
            this.addBotMessage("📋 Visa Requirements for East Africa:");
            this.addBotMessage("🇺🇬 Uganda: $50 e-visa or on arrival<br>🇰🇪 Kenya: $50 e-visa (required in advance)<br>🇹🇿 Tanzania: $50-100 visa on arrival<br>🇷🇼 Rwanda: $30 visa on arrival");
            this.addBotMessage("💡 East Africa Visa ($100): Valid for Uganda, Kenya, Rwanda<br>📘 Passport: Must be valid 6+ months with 2 blank pages");
            this.showQuickActions(['Visa Help', 'Passport Requirements', 'East Africa Visa']);
        
        } else if (lowerMessage.includes('vaccination') || lowerMessage.includes('health') || lowerMessage.includes('malaria') || lowerMessage.includes('yellow fever')) {
            this.addBotMessage("💊 Health Requirements for East Africa:");
            this.addBotMessage("🟡 Yellow Fever: Required if coming from endemic areas<br>💊 Malaria Prevention: Recommended (consult your doctor)<br>🩹 Routine Vaccines: Ensure up-to-date (MMR, Hepatitis A/B)");
            this.addBotMessage("Most travelers only need malaria prevention. Consult a travel clinic 4-6 weeks before departure.");
            this.showQuickActions(['Health Clinics', 'Malaria Info', 'Vaccination Centers']);
        
        } else if (lowerMessage.includes('accommodation') || lowerMessage.includes('lodge') || lowerMessage.includes('hotel') || lowerMessage.includes('camp')) {
            this.addBotMessage("🏨 Safari Accommodations - From Budget to Ultra-Luxury:");
            this.addBotMessage("💰 Budget ($50-150/night): Clean guesthouses, basic lodges<br>🏕️ Mid-range ($150-400/night): Safari lodges, tented camps<br>👑 Luxury ($400-1200/night): 5-star lodges, private conservancies");
            this.addBotMessage("All include meals, game drives, and airport transfers. Which level interests you?");
            this.showQuickActions(['Budget Options', 'Mid-Range Lodges', 'Luxury Experiences', 'Tented Camps']);
        
        } else if (lowerMessage.includes('food') || lowerMessage.includes('meal') || lowerMessage.includes('diet') || lowerMessage.includes('vegetarian')) {
            this.addBotMessage("🍽️ Safari Dining - Delicious African Cuisine!");
            this.addBotMessage("Most lodges offer:");
            this.addBotMessage("🥗 International buffets with local specialties<br>🌱 Vegetarian/vegan options available<br>🍖 Fresh meats, fruits, and vegetables<br>☕ Great coffee (Uganda & Kenya are famous!)<br>🍷 Wine with dinner at luxury lodges");
            this.addBotMessage("Special diets? Just let us know - lodges are very accommodating!");
            this.showQuickActions(['Dietary Requirements', 'Local Cuisine', 'Meal Plans']);
        
        } else if (lowerMessage.includes('children') || lowerMessage.includes('family') || lowerMessage.includes('kids')) {
            this.addBotMessage("👨‍👩‍👧‍👦 Family Safaris - Perfect for Kids!");
            this.addBotMessage("Age restrictions:");
            this.addBotMessage("🦍 Gorilla trekking: 15+ years (strict rule)<br>🦁 Game drives: All ages welcome<br>🐘 Walking safaris: 12+ years<br>🏕️ Cultural visits: All ages");
            this.addBotMessage("We offer family-friendly lodges with connecting rooms, kid menus, and educational activities!");
            this.showQuickActions(['Family Packages', 'Kid-Friendly Lodges', 'Age Requirements']);
        
        } else if (lowerMessage.includes('solo') || lowerMessage.includes('alone') || lowerMessage.includes('single')) {
            this.addBotMessage("🎒 Solo Safari Adventures - You're Never Alone!");
            this.addBotMessage("Solo travelers love East Africa because:");
            this.addBotMessage("👥 Join group safaris (meet like-minded travelers)<br>👨‍🏫 Professional guides always with you<br>🏨 Solo-friendly accommodations<br>💰 No single supplements on group tours");
            this.addBotMessage("Many solo travelers become lifelong friends on our safaris!");
            this.showQuickActions(['Group Safaris', 'Solo Packages', 'Meet Other Travelers']);
        
        } else if (lowerMessage.includes('photography') || lowerMessage.includes('camera') || lowerMessage.includes('photos')) {
            this.addBotMessage("📸 Photography Safari Tips - Capture Amazing Shots!");
            this.addBotMessage("🌅 Golden hours: 6-9am and 4-7pm (best lighting)<br>📱 Gear: DSLR or good smartphone, extra batteries<br>🔋 Power: Bring portable chargers (limited electricity)<br>🎯 Subjects: Wildlife, landscapes, cultural moments");
            this.addBotMessage("Our guides know the best photo spots and will position vehicles perfectly!");
            this.showQuickActions(['Photography Tours', 'Camera Gear', 'Photo Tips', 'Best Spots']);
        
        } else if (lowerMessage.includes('culture') || lowerMessage.includes('masai') || lowerMessage.includes('local') || lowerMessage.includes('village')) {
            this.addBotMessage("🏘️ Cultural Experiences - Meet Amazing People!");
            this.addBotMessage("🇰🇪 Masai villages (Kenya/Tanzania): Traditional warriors, beadwork<br>🇺🇬 Batwa pygmies (Uganda): Forest people, traditional hunting<br>🇷🇼 Ibyacu cultural village: Genocide memorial, recovery story");
            this.addBotMessage("Cultural visits support local communities and provide authentic insights into East African life!");
            this.showQuickActions(['Masai Culture', 'Batwa Experience', 'Rwanda Culture', 'Village Visits']);
        
        } else if (lowerMessage.includes('economy') || lowerMessage.includes('money') || lowerMessage.includes('currency') || lowerMessage.includes('atm')) {
            this.addBotMessage("💱 East African Economies & Money:");
            this.addBotMessage("💰 Currencies:<br>🇺🇬 Uganda: Ugandan Shilling (UGX)<br>🇰🇪 Kenya: Kenyan Shilling (KES)<br>🇹🇿 Tanzania: Tanzanian Shilling (TZS)<br>🇷🇼 Rwanda: Rwandan Franc (RWF)");
            this.addBotMessage("💡 Tips: USD widely accepted, ATMs in cities, credit cards at lodges. Tourism is a major economic driver!");
            this.showQuickActions(['Currency Exchange', 'ATM Locations', 'Payment Methods']);
        
        } else if (lowerMessage.includes('africa') || lowerMessage.includes('continent') || lowerMessage.includes('history')) {
            this.addBotMessage("🌍 Amazing Africa Facts!");
            this.addBotMessage("Did you know?");
            this.addBotMessage("📊 Africa: 54 countries, 1.4 billion people<br>🌿 30% of world's wildlife lives here<br>🏔️ Kilimanjaro: Africa's highest peak (5,895m)<br>🦍 Only place to see mountain gorillas<br>🌍 Cradle of humanity (earliest human fossils)");
            this.addBotMessage("East Africa is where humanity began and nature thrives!");
            this.showQuickActions(['More Facts', 'Wildlife Stats', 'Geographic Info']);
        
        } else if (lowerMessage.includes('language') || lowerMessage.includes('english') || lowerMessage.includes('speak')) {
            this.addBotMessage("🗣️ Languages in East Africa:");
            this.addBotMessage("🇬🇧 English: Widely spoken (official in Uganda, Kenya)<br>🗨️ Swahili: Common in Kenya, Tanzania<br>🇫🇷 French: Spoken in Rwanda (also English, Kinyarwanda)");
            this.addBotMessage("Good news! You'll have no communication problems - our guides are fluent in English!");
            this.showQuickActions(['Basic Swahili', 'Guide Languages', 'Communication']);
        
        } else if (lowerMessage.includes('climate') || lowerMessage.includes('temperature') || lowerMessage.includes('rainfall')) {
            this.addBotMessage("🌡️ East African Climate:");
            this.addBotMessage("🌞 Equatorial climate with two seasons:<br>☀️ Dry seasons: Jun-Sep & Dec-Feb (best for safaris)<br>🌧️ Wet seasons: Mar-May & Oct-Nov (green, fewer crowds)");
            this.addBotMessage("🌡️ Temperatures: 20-30°C (68-86°F) year-round<br>🏔️ Higher altitudes cooler (gorilla areas: 15-25°C)");
            this.showQuickActions(['Weather Forecast', 'Packing Guide', 'Seasonal Calendar']);
        
        } else if (lowerMessage.includes('transport') || lowerMessage.includes('flight') || lowerMessage.includes('airport') || lowerMessage.includes('travel')) {
            this.addBotMessage("✈️ Getting to East Africa:");
            this.addBotMessage("🛩️ Main airports:<br>🇺🇬 Entebbe (EBB) - Uganda<br>🇰🇪 Nairobi (NBO) - Kenya<br>🇹🇿 Kilimanjaro (JRO) - Tanzania<br>🇷🇼 Kigali (KGL) - Rwanda");
            this.addBotMessage("✈️ Airlines: Emirates, KLM, Turkish, Ethiopian, Qatar Airways<br>🚐 Ground transport: We handle all transfers!");
            this.showQuickActions(['Flight Booking', 'Airport Transfers', 'Airlines', 'Ground Transport']);
        
        } else if (lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('appreciate')) {
            const thanks = ['You\'re very welcome! 😊', 'My pleasure! Happy to help!', 'Anytime! That\'s what I\'m here for!', 'You\'re so welcome! 🌟'];
            this.addBotMessage(thanks[Math.floor(Math.random() * thanks.length)]);
            this.addBotMessage("Is there anything else about East African safaris you\'d like to know? I\'m here to help make your dream safari a reality!");
            this.showQuickActions(['More Questions', 'Book Safari', 'Get Quote', 'WhatsApp Us']);
        
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            const greetings = ['Hello there! 👋', 'Hi! Great to meet you!', 'Hey! Welcome to Gisu Safaris!', 'Hello! Ready for an African adventure?'];
            this.addBotMessage(greetings[Math.floor(Math.random() * greetings.length)]);
            this.addBotMessage("I\'m your personal safari expert! I can help you with everything about East African safaris - from gorilla trekking to the Great Migration. What interests you most?");
            this.showQuickActions(['Gorilla Trekking', 'Big Five Safari', 'Great Migration', 'All Packages']);
        
        } else if (lowerMessage.includes('sport') || lowerMessage.includes('football') || lowerMessage.includes('soccer') || lowerMessage.includes('athletics')) {
            this.addBotMessage("⚽ East African Sports Excellence!");
            this.addBotMessage("🏃‍♂️ World Champions:\u003cbr\u003e🇰🇪 Kenya: Marathon & distance running legends\u003cbr\u003e🇺🇬 Uganda: Joshua Cheptegei (world records)\u003cbr\u003e🇹🇿 Tanzania: Football (Simba SC), boxing\u003cbr\u003e🇷🇼 Rwanda: Cycling, football development");
            this.addBotMessage("⚽ Football is the most popular sport. Many lodges have sports viewing areas!");
            this.showQuickActions(['Sports Events', 'Stadium Visits', 'Athletic Tours']);
        
        } else if (lowerMessage.includes('climate') || lowerMessage.includes('environment') || lowerMessage.includes('green')) {
            this.addBotMessage("🌍 East Africa: Leading Climate Action!");
            this.addBotMessage("♻️ Environmental Leadership:\u003cbr\u003e🇷🇼 Rwanda: Plastic bag ban, reforestation\u003cbr\u003e🇰🇪 Kenya: Plastic ban, renewable energy\u003cbr\u003e🇺🇬 Uganda: Forest conservation, solar power\u003cbr\u003e🇹🇿 Tanzania: Marine conservation, eco-tourism");
            this.addBotMessage("🌱 Your safari supports sustainable tourism and conservation efforts!");
            this.showQuickActions(['Eco-Tourism', 'Conservation Projects', 'Green Lodges']);
        
        } else if (lowerMessage.includes('transport') || lowerMessage.includes('infrastructure') || lowerMessage.includes('road')) {
            this.addBotMessage("🛣️ East African Infrastructure (2024):");
            this.addBotMessage("🚗 Road Networks:\u003cbr\u003e🇰🇪 Kenya: 177,800km roads, modern highways\u003cbr\u003e🇺🇬 Uganda: 144,000km roads, improving rapidly\u003cbr\u003e🇹🇿 Tanzania: 145,000km roads, coastal highways\u003cbr\u003e🇷🇼 Rwanda: 14,000km roads (best maintained)");
            this.addBotMessage("✈️ We use well-maintained 4x4 safari vehicles and handle all transfers!");
            this.showQuickActions(['Vehicle Safety', 'Transfer Services', 'Road Conditions']);
        
        } else {
            // Enhanced default intelligent response
            const responses = [
                "🤔 That\'s a fascinating question! As your East African expert, I\'m here to help.",
                "🌍 Interesting! I\'d love to share my knowledge about East Africa with you.",
                "🦁 Great question! Let me help you discover more about East African safaris.",
                "✨ I\'m excited to help you learn more about this amazing region!"
            ];
            
            this.addBotMessage(responses[Math.floor(Math.random() * responses.length)]);
            this.addBotMessage("I\'m your comprehensive East African guide - from safari planning to cultural insights, wildlife facts, travel logistics, and everything about the region. What would you like to explore?");
            this.showQuickActions(['Safari Planning', 'African Culture', 'Wildlife & Nature', 'Countries Info', 'Why Choose Gisu', 'Travel Tips']);
        }
    }
    trackEvent(action, label) {
        // Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': 'AI_Bot',
                'event_label': label
            });
        }
        
        // You can also send to your own analytics
        console.log(`AI Bot Event: ${action} - ${label}`);
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            const input = document.getElementById('aiUserInput');
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.sendMessage();
                    }
                });
            }
        });
    }
}

const safariBot = new SafariAIBot();
