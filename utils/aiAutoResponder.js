class AIAutoResponder {
    constructor() {
        this.enabledUsers = new Set();
        this.enabledGroups = new Set();

        // Local response patterns - completely privacy-focused
        this.loadResponsePatterns();
    }

    loadResponsePatterns() {
        // Greeting responses (English + Hindi + Hinglish)
        this.greetingPatterns = [
            { pattern: /^(hi|hello|hey|good morning|good evening|namaste|namaskar|adab)/i, responses: ['Hello!', 'Hi there!', 'Hey! How are you?', 'Good to see you!', 'Namaste!', 'Namaskar!'] },
            { pattern: /^(kya haal|kaise ho|kaisi ho|kya chal raha|wassup)/i, responses: ['Sab badhiya!', 'Main theek hun!', 'All good yaar!', 'Bas chill kar raha hun!'] },
            { pattern: /how are you|kaise ho|kaisi ho|what\'s up/i, responses: ['I\'m doing well, thanks!', 'All good here!', 'Great, thanks for asking!', 'Sab badhiya hai!', 'Main ekdum fine hun!'] },
        ];

        // Question responses (English + Hindi + Hinglish)
        this.questionPatterns = [
            { pattern: /what time|kitne baje|time kya|samay kya/i, responses: [`It's ${new Date().toLocaleTimeString()}`, `Abhi ${new Date().toLocaleTimeString()} baj rahe hain`] },
            { pattern: /what day|kaun sa din|aaj kya din/i, responses: [`Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}`, `Aaj ${new Date().toLocaleDateString('hi-IN', { weekday: 'long' })} hai`] },
            { pattern: /how to|help with|can you help|kaise karu|madad|help chahiye/i, responses: ['I\'d be happy to help!', 'What do you need assistance with?', 'How can I help you?', 'Haan bolo, kya madad chahiye?', 'Main help kar sakta hun!'] },
            { pattern: /kya kar rahe|kya chal raha|what doing/i, responses: ['Just chatting!', 'Bas yahan timepass kar raha hun!', 'Tumse baat kar raha hun!', 'Nothing much, just here!'] },
        ];

        // Sentiment-based responses (English + Hindi + Hinglish)
        this.positiveResponses = ['That\'s great!', 'Awesome!', 'Wonderful!', 'Nice!', 'That sounds good!', 'Wah bhai!', 'Badhiya!', 'Zabardast!', 'Mast hai!', 'Ekdum sahi!'];
        this.negativeResponses = ['I\'m sorry to hear that.', 'That doesn\'t sound good.', 'I hope things get better.', 'Is there anything I can do to help?', 'Yaar ye to sad hai.', 'Koi baat nahi, sab theek ho jayega.', 'Tension mat lo.'];
        this.neutralResponses = ['I see.', 'Okay.', 'Got it.', 'Thanks for sharing.', 'Interesting.', 'Achha.', 'Theek hai.', 'Samajh gaya.', 'Haan bhai.', 'OK yaar.'];

        // Smart reply templates (English + Hindi + Hinglish)
        this.smartReplyTemplates = {
            question: ['Yes', 'No', 'Maybe', 'I think so', 'Not sure', 'Haan', 'Nahi', 'Shayad', 'Ho sakta hai', 'Pata nahi'],
            agreement: ['I agree', 'Exactly!', 'You\'re right', 'That makes sense', 'Bilkul sahi!', 'Ekdum right!', 'Yaar tu sahi keh raha hai', 'Main agree karta hun'],
            acknowledgment: ['Thanks', 'Got it', 'Okay', 'Sure', 'Alright', 'Dhanyawad', 'Samajh gaya', 'Theek hai', 'Haan bhai', 'OK yaar'],
            positive: ['Great!', 'Awesome!', 'Nice!', 'Cool!', 'Perfect!', 'Badhiya!', 'Mast!', 'Zabardast!', 'Perfect hai!', 'Ekdum sahi!'],
            negative: ['Sorry to hear that', 'That\'s unfortunate', 'I understand', 'Hope it gets better', 'Bura laga sunke', 'Koi baat nahi', 'Samajh sakta hun', 'Sab theek ho jayega']
        };
    }

    toggleUserAutoResponder(userId, enabled) {
        if (enabled) {
            this.enabledUsers.add(userId);
        } else {
            this.enabledUsers.delete(userId);
        }
    }

    toggleGroupAutoResponder(groupId, enabled) {
        if (enabled) {
            this.enabledGroups.add(groupId);
        } else {
            this.enabledGroups.delete(groupId);
        }
    }

    isEnabled(userId, groupId = null) {
        if (groupId) {
            return this.enabledGroups.has(groupId);
        }
        return this.enabledUsers.has(userId);
    }

    // Generate smart replies based on conversation context
    async generateSmartReplies(conversationHistory, maxReplies = 3) {
        console.log('Analyzing conversation history:', conversationHistory);
        
        if (!conversationHistory || conversationHistory.length === 0) {
            return ['Hello!', 'How can I help?', 'What\'s on your mind?', 'Namaste!', 'Kya haal hai?'];
        }

        const lastMessage = conversationHistory[conversationHistory.length - 1];
        const messageText = lastMessage.message.toLowerCase().trim();
        const replies = [];

        console.log('Last message analyzed:', messageText);

        // Analyze the actual conversation flow with enhanced context
        const conversationContext = this.analyzeConversationContext(conversationHistory);
        console.log('Conversation context:', conversationContext);

        // Priority 1: Generate highly contextual replies based on the EXACT last message content
        const directReplies = this.generateDirectContextualReplies(messageText, lastMessage, conversationHistory);
        if (directReplies.length > 0) {
            replies.push(...directReplies);
            console.log('Direct contextual replies:', directReplies);
        }

        // Priority 2: Analyze conversation patterns and participants
        if (conversationHistory.length > 1) {
            const conversationFlowReplies = this.generateAdvancedConversationFlowReplies(conversationHistory);
            replies.push(...conversationFlowReplies);
        }

        // Priority 3: Generate contextual replies based on recent conversation themes
        const themeReplies = this.generateThemeBasedReplies(conversationHistory);
        replies.push(...themeReplies);

        // Priority 4: Language-specific responses (detect if Hindi/Hinglish and respond accordingly)
        const languageReplies = this.generateLanguageSpecificReplies(messageText, conversationHistory);
        replies.push(...languageReplies);

        // Priority 5: Sentiment and emotion-based responses
        const sentiment = this.detectSentiment(messageText);
        const emotionalReplies = this.generateEmotionallyIntelligentReplies(sentiment, messageText, conversationContext);
        replies.push(...emotionalReplies);

        // Priority 6: Question-specific intelligent responses
        if (this.isQuestion(messageText)) {
            const questionReplies = this.generateIntelligentQuestionResponses(messageText, conversationHistory);
            replies.push(...questionReplies);
        }

        // Remove duplicates and prioritize more contextual responses
        const uniqueReplies = [...new Set(replies)];
        console.log('Generated unique replies:', uniqueReplies);

        // If we have good contextual replies, return them
        if (uniqueReplies.length > 0) {
            return uniqueReplies.slice(0, Math.min(maxReplies, uniqueReplies.length));
        }

        // Fallback with conversation-aware responses
        console.log('Using fallback replies');
        return this.generateIntelligentFallbackReplies(messageText, conversationContext, conversationHistory);
    }

    // Analyze the overall conversation context
    analyzeConversationContext(conversationHistory) {
        const context = {
            topics: [],
            sentiment: 'neutral',
            questionCount: 0,
            isOngoing: true,
            lastSpeaker: null
        };

        if (conversationHistory.length === 0) return context;

        // Extract topics from recent messages
        const recentMessages = conversationHistory.slice(-5);
        const allText = recentMessages.map(m => m.message.toLowerCase()).join(' ');

        // Detect topics
        context.topics = this.extractTopics(recentMessages);

        // Count questions
        context.questionCount = recentMessages.filter(m => m.message.includes('?')).length;

        // Get last speaker
        context.lastSpeaker = conversationHistory[conversationHistory.length - 1].from;

        // Analyze overall sentiment
        const sentiments = recentMessages.map(m => this.detectSentiment(m.message));
        const posCount = sentiments.filter(s => s === 'positive').length;
        const negCount = sentiments.filter(s => s === 'negative').length;

        if (posCount > negCount) context.sentiment = 'positive';
        else if (negCount > posCount) context.sentiment = 'negative';

        return context;
    }

    // Generate replies based on the specific content of the last message
    generateContextualReplies(messageText, context) {
        const replies = [];

        // Handle specific greetings (English + Hindi + Hinglish)
        if (/^(hi|hello|hey|namaste|namaskar|adab|kya haal)\b/i.test(messageText)) {
            if (context.topics.includes('time') || messageText.includes('morning') || messageText.includes('subah')) {
                replies.push('Good morning!', 'Morning! Hope you have a great day!', 'Subah bakhair!', 'Good morning yaar!');
            } else if (messageText.includes('evening') || messageText.includes('shaam')) {
                replies.push('Good evening!', 'Evening! How was your day?', 'Shaam bakhair!', 'Good evening bhai!');
            } else {
                replies.push('Hello there!', 'Hey! How are you doing?', 'Hi! What\'s up?', 'Namaste!', 'Kya haal hai?', 'Wassup yaar!');
            }
            return replies;
        }

        // Handle questions specifically (English + Hindi + Hinglish)
        if (messageText.includes('?') || messageText.includes('kya') || messageText.includes('kaise') || messageText.includes('kaun') || messageText.includes('kab')) {
            if (messageText.includes('how are you') || messageText.includes('how\'re you') || messageText.includes('kaise ho') || messageText.includes('kaisi ho')) {
                replies.push('I\'m doing well, thanks! How about you?', 'Great, thanks for asking!', 'All good here! How are things with you?', 'Main bilkul theek hun! Tum kaise ho?', 'Sab badhiya! Tumhara kya haal?');
            } else if (messageText.includes('what are you doing') || messageText.includes('what\'re you doing') || messageText.includes('kya kar rahe') || messageText.includes('kya chal raha')) {
                replies.push('Just chatting with you!', 'Not much, just here to help!', 'Having a nice conversation with you!', 'Bas tumse baat kar raha hun!', 'Kuch khas nahi, timepass!');
            } else if (messageText.includes('how was your day') || messageText.includes('how\'s your day') || messageText.includes('din kaisa')) {
                replies.push('It\'s been good, thanks!', 'Pretty good day so far!', 'Going well, how about yours?', 'Achha chal raha hai!', 'Badhiya din hai, tumhara kya haal?');
            } else if (messageText.includes('what time') || messageText.includes('what\'s the time') || messageText.includes('kitne baje') || messageText.includes('time kya')) {
                replies.push(`It's ${new Date().toLocaleTimeString()}`, 'Let me check the time for you', `Abhi ${new Date().toLocaleTimeString()} baj rahe hain`, 'Time check karta hun!');
            } else if (messageText.includes('where') || messageText.includes('when') || messageText.includes('why') || messageText.includes('kahan') || messageText.includes('kab') || messageText.includes('kyun')) {
                replies.push('That\'s a good question!', 'I\'m not sure about that', 'What do you think?', 'Yaar ye to acha sawal hai!', 'Mujhe nahi pata, tum kya sochte ho?');
            } else {
                // Generic question responses
                replies.push('Hmm, let me think about that', 'That\'s interesting!', 'Good question!', 'Hmm, sochne do', 'Interesting sawal hai!', 'Achha question!');
            }
            return replies;
        }

        // Handle statements about activities (English + Hindi + Hinglish)
        if (messageText.includes('working') || messageText.includes('studying') || messageText.includes('padh raha') || messageText.includes('kaam kar raha') || messageText.includes('office')) {
            replies.push('That sounds productive!', 'Hope it\'s going well!', 'What are you working on?', 'Mehnat kar rahe ho!', 'Kya kaam chal raha hai?', 'Study hard yaar!');
        } else if (messageText.includes('eating') || messageText.includes('lunch') || messageText.includes('dinner') || messageText.includes('khana') || messageText.includes('kha raha')) {
            replies.push('Enjoy your meal!', 'What are you having?', 'That sounds tasty!', 'Khana enjoy karo!', 'Kya kha rahe ho?', 'Maza aaye khane mein!');
        } else if (messageText.includes('watching') || messageText.includes('movie') || messageText.includes('show') || messageText.includes('dekh raha') || messageText.includes('film')) {
            replies.push('What are you watching?', 'Sounds entertaining!', 'Is it good?', 'Kya dekh rahe ho?', 'Maza aa raha hai?', 'Kaisi hai movie?');
        } else if (messageText.includes('tired') || messageText.includes('sleepy') || messageText.includes('thak gaya') || messageText.includes('neend aa rahi')) {
            replies.push('You should get some rest!', 'Take care of yourself!', 'Maybe time for a break?', 'Aram karo yaar!', 'So jao bhai!', 'Break lelo thoda!');
        } else if (messageText.includes('excited') || messageText.includes('happy') || messageText.includes('khush') || messageText.includes('maza aa raha')) {
            replies.push('That\'s wonderful!', 'I\'m happy for you!', 'What\'s got you excited?', 'Wah! Badhiya!', 'Khushi ki baat hai!', 'Kya baat hai!');
        }

        // Handle thank you messages (English + Hindi + Hinglish)
        if (messageText.includes('thank') || messageText.includes('thanks') || messageText.includes('shukriya') || messageText.includes('dhanyawad') || messageText.includes('thanks yaar')) {
            replies.push('You\'re welcome!', 'No problem!', 'Happy to help!', 'Anytime!', 'Koi baat nahi!', 'Welcome hai bhai!', 'Mention not yaar!');
            return replies;
        }

        // Handle goodbye messages (English + Hindi + Hinglish)
        if (messageText.includes('bye') || messageText.includes('see you') || messageText.includes('talk later') || messageText.includes('alvida') || messageText.includes('milte hain') || messageText.includes('chalta hun')) {
            replies.push('Goodbye!', 'See you later!', 'Take care!', 'Talk to you soon!', 'Bye yaar!', 'Milte hain!', 'Take care bhai!', 'Phir baat karte hain!');
            return replies;
        }

        return replies;
    }

    // Generate replies based on detected topics in conversation
    generateTopicBasedReplies(recentMessages) {
        const replies = [];
        const topics = this.extractTopics(recentMessages);

        if (topics.includes('work')) {
            replies.push('How\'s work going?', 'Hope your work day is productive!');
        }
        if (topics.includes('food')) {
            replies.push('That sounds delicious!', 'I love food discussions!');
        }
        if (topics.includes('entertainment')) {
            replies.push('Sounds fun!', 'What do you recommend?');
        }
        if (topics.includes('weather')) {
            replies.push('The weather can really affect our mood!', 'Hope it\'s nice where you are!');
        }

        return replies;
    }

    // Get sentiment-appropriate replies
    getSentimentReplies(sentiment, messageText) {
        if (sentiment === 'positive') {
            return ['That\'s great to hear!', 'Awesome!', 'I\'m glad!'];
        } else if (sentiment === 'negative') {
            return ['I\'m sorry to hear that', 'That sounds tough', 'Hope things get better'];
        } else {
            // Neutral - provide engaging responses
            return ['Tell me more', 'That\'s interesting', 'I see'];
        }
    }

    // Generate contextual response for group chats
    async generateGroupResponse(message, conversationHistory, username) {
        const lowerMessage = message.toLowerCase();

        // Check greeting patterns
        for (const pattern of this.greetingPatterns) {
            if (pattern.pattern.test(message)) {
                return this.getRandomResponse(pattern.responses);
            }
        }

        // Check question patterns
        for (const pattern of this.questionPatterns) {
            if (pattern.pattern.test(message)) {
                return this.getRandomResponse(pattern.responses);
            }
        }

        // Sentiment-based response
        const sentiment = this.detectSentiment(message);
        if (sentiment === 'positive') {
            return this.getRandomResponse(this.positiveResponses);
        } else if (sentiment === 'negative') {
            return this.getRandomResponse(this.negativeResponses);
        }

        // Default helpful responses for questions
        if (lowerMessage.includes('?')) {
            const helpResponses = [
                'I\'m not sure about that, but maybe someone else in the group can help!',
                'That\'s a good question!',
                'Hmm, I don\'t have the answer to that.',
                'You might want to ask someone with more expertise on this topic.'
            ];
            return this.getRandomResponse(helpResponses);
        }

        // Generic acknowledgment
        return this.getRandomResponse(this.neutralResponses);
    }

    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Check if message should trigger group AI response
    shouldRespondInGroup(message) {
        const lowerMessage = message.toLowerCase();

        // Respond if tagged
        if (lowerMessage.includes('@modernbot') || lowerMessage.includes('modernbot')) {
            return true;
        }

        // Respond to greetings
        if (this.greetingPatterns.some(p => p.pattern.test(message))) {
            return true;
        }

        // Respond to direct questions
        const questionPatterns = [
            /what\s+(is|are|do|does|can|will|would)/,
            /how\s+(do|does|can|to|much|many)/,
            /when\s+(is|are|do|does|will|would)/,
            /where\s+(is|are|do|does|can)/,
            /why\s+(is|are|do|does|did)/,
            /who\s+(is|are|can|will|would)/,
            /\?$/
        ];

        // Only respond to questions occasionally to avoid spam
        const shouldRespond = questionPatterns.some(pattern => pattern.test(lowerMessage));
        return shouldRespond && Math.random() < 0.3; // 30% chance to respond to questions
    }

    // Simple sentiment detection using word analysis (English + Hindi + Hinglish)
    detectSentiment(message) {
        const positiveWords = [
            'happy', 'good', 'great', 'awesome', 'amazing', 'wonderful', 'fantastic',
            'excellent', 'perfect', 'love', 'like', 'enjoy', 'pleased', 'satisfied',
            'thankful', 'grateful', 'appreciate', 'brilliant', 'outstanding', 'marvelous',
            // Hindi/Hinglish positive words
            'khush', 'khushi', 'badhiya', 'achha', 'accha', 'mast', 'zabardast', 'shandar',
            'kamaal', 'wah', 'wow', 'ekdum', 'bilkul', 'sahi', 'perfect', 'awesome',
            'cool', 'nice', 'superb', 'fantastic', 'brilliant', 'maja', 'mazaa', 'fun'
        ];

        const negativeWords = [
            'sad', 'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate',
            'dislike', 'angry', 'mad', 'furious', 'disappointed', 'upset', 'annoyed',
            'frustrated', 'worried', 'concerned', 'troubled', 'depressed', 'miserable',
            // Hindi/Hinglish negative words
            'dukhi', 'udas', 'pareshan', 'tension', 'problem', 'dikkat', 'bura', 'ganda',
            'bekaar', 'faltu', 'waste', 'boring', 'sad', 'depressed', 'worried', 'tense',
            'gussa', 'angry', 'pareshaan', 'mushkil', 'difficult', 'hard', 'tough'
        ];

        const words = message.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(word => positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => negativeWords.includes(word)).length;

        if (positiveCount > negativeCount && positiveCount > 0) return 'positive';
        if (negativeCount > positiveCount && negativeCount > 0) return 'negative';
        return 'neutral';
    }

    // Context-aware reply generation based on conversation flow
    generateContextualReply(conversationHistory) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return null;
        }

        const recentMessages = conversationHistory.slice(-3);
        const topics = this.extractTopics(recentMessages);

        // Generate relevant responses based on topics
        if (topics.includes('time')) {
            return `It's ${new Date().toLocaleTimeString()} right now.`;
        }

        if (topics.includes('weather')) {
            return 'I don\'t have access to weather data, but you could check a weather app!';
        }

        return null;
    }

    // Enhanced topic extraction with better keyword matching (English + Hindi + Hinglish)
    extractTopics(messages) {
        const topicKeywords = {
            time: ['time', 'clock', 'hour', 'minute', 'when', 'today', 'tomorrow', 'yesterday', 'now', 'later', 'samay', 'waqt', 'abhi', 'aaj', 'kal', 'parso', 'kitne baje'],
            weather: ['weather', 'rain', 'sunny', 'cloudy', 'temperature', 'hot', 'cold', 'warm', 'snow', 'storm', 'mausam', 'baarish', 'garmi', 'sardi', 'dhoop', 'baadal'],
            food: ['eat', 'food', 'hungry', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cooking', 'recipe', 'delicious', 'khana', 'kha', 'bhookh', 'nashta', 'lunch', 'dinner', 'pakana', 'tasty', 'mazedaar'],
            work: ['work', 'job', 'office', 'meeting', 'project', 'task', 'deadline', 'boss', 'colleague', 'business', 'kaam', 'naukri', 'office', 'meeting', 'project', 'kaam', 'boss', 'sahab', 'vyavasaya'],
            entertainment: ['movie', 'music', 'game', 'show', 'book', 'video', 'watch', 'play', 'fun', 'entertainment', 'film', 'gana', 'gaana', 'game', 'show', 'kitab', 'video', 'dekh', 'khel', 'maza', 'manoranjan'],
            technology: ['computer', 'phone', 'app', 'software', 'internet', 'website', 'tech', 'digital', 'online', 'computer', 'phone', 'mobile', 'app', 'software', 'internet', 'website', 'tech', 'digital', 'online'],
            travel: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'visit', 'journey', 'explore', 'destination', 'yatra', 'safar', 'ghumna', 'flight', 'hotel', 'milna', 'ghumna', 'dekhna'],
            health: ['health', 'doctor', 'medicine', 'exercise', 'gym', 'fit', 'sick', 'tired', 'rest', 'sleep', 'sehat', 'doctor', 'dawai', 'vyayam', 'gym', 'fit', 'bimar', 'thak', 'aram', 'neend'],
            family: ['family', 'mom', 'dad', 'parent', 'child', 'brother', 'sister', 'relative', 'home', 'house', 'parivar', 'maa', 'papa', 'mata', 'pita', 'baccha', 'bhai', 'behen', 'rishtedaar', 'ghar', 'makan'],
            education: ['school', 'study', 'learn', 'class', 'teacher', 'student', 'exam', 'homework', 'university', 'school', 'padhai', 'seekhna', 'class', 'teacher', 'student', 'pariksha', 'homework', 'university', 'vidyalaya']
        };

        const foundTopics = [];
        const allText = messages.map(m => m.message.toLowerCase()).join(' ');

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            const matchCount = keywords.filter(keyword => allText.includes(keyword)).length;
            if (matchCount >= 1) {
                foundTopics.push(topic);
            }
        }

        return foundTopics;
    }

    // Generate replies based on conversation flow patterns
    generateConversationFlowReplies(conversationHistory) {
        const replies = [];
        const recent = conversationHistory.slice(-5);

        // Check for question-answer patterns
        const hasRecentQuestion = recent.some(msg => msg.message.includes('?'));
        if (hasRecentQuestion && !recent[recent.length - 1].message.includes('?')) {
            replies.push('Any other questions?', 'Does that help?', 'What else would you like to know?');
        }

        // Check for conversation starters
        const lastMsg = conversationHistory[conversationHistory.length - 1].message.toLowerCase();
        if (lastMsg.length < 20 && !lastMsg.includes('?')) {
            replies.push('Tell me more about that', 'That sounds interesting!', 'How did that go?');
        }

        // Check for activity mentions
        if (lastMsg.includes('going to') || lastMsg.includes('will')) {
            replies.push('That sounds exciting!', 'Hope it goes well!', 'When is that happening?');
        }

        return replies;
    }

    // Generate time-aware responses
    generateTimeAwareReplies(messageText) {
        const now = new Date();
        const hour = now.getHours();
        const replies = [];

        if (messageText.includes('good morning') || messageText.includes('morning')) {
            if (hour < 12) {
                replies.push('Good morning!', 'Hope you have a great day ahead!');
            } else if (hour < 17) {
                replies.push('Good afternoon!', 'Hope your day is going well!');
            } else {
                replies.push('Good evening!', 'Hope you had a good day!');
            }
        }

        if (messageText.includes('tired') || messageText.includes('sleepy')) {
            if (hour > 21 || hour < 6) {
                replies.push('It\'s getting late, you should get some rest!', 'Time for bed?');
            } else {
                replies.push('Maybe take a short break?', 'Have you been working hard?');
            }
        }

        if (messageText.includes('lunch') || messageText.includes('dinner')) {
            if (hour >= 11 && hour <= 14) {
                replies.push('Enjoy your lunch!', 'What are you having for lunch?');
            } else if (hour >= 17 && hour <= 21) {
                replies.push('Enjoy your dinner!', 'What\'s for dinner?');
            }
        }

        return replies;
    }

    // Generate direct contextual replies based on exact message content
    generateDirectContextualReplies(messageText, lastMessage, conversationHistory) {
        const replies = [];
        const originalMessage = lastMessage.message; // Keep original casing

        // Detect specific question types with multilingual support
        if (messageText.includes('where') || messageText.includes('kahan') || messageText.includes('kidhar')) {
            if (messageText.includes('live') || messageText.includes('rahte') || messageText.includes('raho')) {
                replies.push(
                    'I\'m just a digital assistant, I don\'t have a physical location!',
                    'I exist in the digital world! Where are you from?',
                    'Main digital duniya mein rehta hun! Aap kahan se ho?',
                    'I\'m everywhere and nowhere at the same time! 😄'
                );
            } else if (messageText.includes('from') || messageText.includes('se ho') || messageText.includes('se aaye')) {
                replies.push(
                    'I\'m from the world of code and algorithms!',
                    'Born in the digital realm! What about you?',
                    'Main code ki duniya se hun! Aap kahan se?',
                    'I come from the land of 1s and 0s! 🤖'
                );
            } else {
                replies.push(
                    'That\'s a location question! Can you be more specific?',
                    'Where exactly are you asking about?',
                    'Kahan ke baare mein puch rahe ho?'
                );
            }
        }

        // Handle "what are you doing" more contextually
        if (messageText.includes('what') && (messageText.includes('doing') || messageText.includes('kar rahe') || messageText.includes('kartoy'))) {
            // Check if this question was asked recently
            const recentDoingQuestions = conversationHistory.slice(-5).filter(msg => 
                msg.message.toLowerCase().includes('doing') || 
                msg.message.toLowerCase().includes('kar rahe') ||
                msg.message.toLowerCase().includes('kartoy')
            );
            
            if (recentDoingQuestions.length > 1) {
                replies.push(
                    'Still chatting with you! Getting better at it each time 😊',
                    'Same thing - having this conversation! You seem curious!',
                    'Abhi bhi tumse baat kar raha hun! Lagta hai tumko jaanna hai!',
                    'You keep asking - I keep chatting! What about you?'
                );
            } else {
                replies.push(
                    'Just having this wonderful conversation with you!',
                    'Chatting and learning from our conversation!',
                    'Bas tumse baat kar raha hun aur seekh raha hun!',
                    'Analyzing our chat and thinking of good responses!'
                );
            }
        }

        // Handle repeated questions intelligently
        const lastFewMessages = conversationHistory.slice(-3);
        const isRepeatedQuestion = lastFewMessages.filter(msg => 
            msg.message.toLowerCase().trim() === messageText.trim()
        ).length > 1;

        if (isRepeatedQuestion) {
            replies.push(
                'I noticed you asked this before! Is there something specific you\'d like to know?',
                'You seem really interested in this topic!',
                'Same question again? Tell me more about what you\'re thinking!',
                'Lagta hai ye topic tumhe interesting laga! Aur batao!'
            );
        }

        // Context-aware responses based on conversation flow
        if (conversationHistory.length > 2) {
            const participantNames = [...new Set(conversationHistory.map(msg => msg.from))];
            const lastSpeaker = lastMessage.from;
            
            // If it's a back-and-forth conversation
            if (participantNames.length > 1) {
                const otherParticipants = participantNames.filter(name => name !== lastSpeaker);
                if (otherParticipants.length > 0) {
                    replies.push(`Interesting question, ${lastSpeaker}! What do others think?`);
                }
            }
        }

        return replies;
    }

    // Generate advanced conversation flow replies
    generateAdvancedConversationFlowReplies(conversationHistory) {
        const replies = [];
        const recentMessages = conversationHistory.slice(-5);
        
        // Analyze conversation momentum
        const messageFrequency = recentMessages.length;
        const uniqueSpeakers = new Set(recentMessages.map(msg => msg.from)).size;
        
        // If it's an active conversation with multiple participants
        if (uniqueSpeakers > 1 && messageFrequency >= 3) {
            replies.push(
                'This is a great conversation!',
                'I love seeing everyone engaged!',
                'Bahut achhi discussion chal rahi hai!'
            );
        }
        
        // Check for topic shifts
        const oldTopics = this.extractTopics(conversationHistory.slice(-10, -5));
        const newTopics = this.extractTopics(recentMessages);
        const topicShift = oldTopics.length > 0 && !oldTopics.some(topic => newTopics.includes(topic));
        
        if (topicShift) {
            replies.push(
                'Interesting how our conversation evolved!',
                'Nice topic change!',
                'Topic badal gaya, interesting!'
            );
        }

        return replies;
    }

    // Generate theme-based replies from conversation analysis
    generateThemeBasedReplies(conversationHistory) {
        const replies = [];
        const allMessages = conversationHistory.map(msg => msg.message.toLowerCase()).join(' ');
        
        // Detect recurring themes
        const themes = {
            friendship: ['friend', 'dost', 'yaar', 'bhai', 'buddy'],
            work: ['work', 'kaam', 'job', 'office', 'meeting'],
            fun: ['fun', 'maza', 'enjoy', 'party', 'game'],
            food: ['eat', 'khana', 'food', 'hungry', 'bhook'],
            study: ['study', 'padhai', 'exam', 'school', 'college']
        };

        for (const [theme, keywords] of Object.entries(themes)) {
            const matchCount = keywords.filter(keyword => allMessages.includes(keyword)).length;
            if (matchCount >= 2) {
                switch (theme) {
                    case 'friendship':
                        replies.push('Friendship is such a beautiful thing!', 'Dosti mein kya baat hai!');
                        break;
                    case 'work':
                        replies.push('Work-life balance is important!', 'Kaam important hai par aram bhi!');
                        break;
                    case 'fun':
                        replies.push('Life should be fun!', 'Maza karna zaroori hai!');
                        break;
                    case 'food':
                        replies.push('Food brings people together!', 'Khana sab ko pasand hai!');
                        break;
                    case 'study':
                        replies.push('Learning never stops!', 'Padhai kabhi nahi rukni chahiye!');
                        break;
                }
            }
        }

        return replies;
    }

    // Generate language-specific replies
    generateLanguageSpecificReplies(messageText, conversationHistory) {
        const replies = [];
        
        // Detect language patterns in recent conversation
        const recentText = conversationHistory.slice(-3).map(msg => msg.message.toLowerCase()).join(' ');
        
        const hindiWords = ['kya', 'hai', 'aur', 'mein', 'hoon', 'tum', 'aap', 'kaise', 'kaisi', 'kahan', 'kab', 'kyun'];
        const hinglishWords = ['yaar', 'bhai', 'dekho', 'suno', 'achha', 'theek', 'bas', 'arre', 'wah'];
        
        const hindiCount = hindiWords.filter(word => recentText.includes(word)).length;
        const hinglishCount = hinglishWords.filter(word => recentText.includes(word)).length;
        
        // If conversation has Hindi/Hinglish elements, respond accordingly
        if (hindiCount > 1 || hinglishCount > 1) {
            if (messageText.includes('kartoy')) { // Marathi influence
                replies.push(
                    'Tumhi Marathi boltat ka? Mala thoda thoda samajte!',
                    'That sounds like Marathi! I understand a little bit!',
                    'Regional languages are so beautiful!'
                );
            } else {
                replies.push(
                    'Hindi mein baat karna achha lagta hai!',
                    'Hinglish is such a fun way to communicate!',
                    'Regional touch conversation ko interesting banata hai!'
                );
            }
        }

        return replies;
    }

    // Generate emotionally intelligent replies
    generateEmotionallyIntelligentReplies(sentiment, messageText, context) {
        const replies = [];
        
        // Advanced sentiment analysis with context
        if (sentiment === 'positive') {
            if (context.questionCount > 2) {
                replies.push('Your curiosity is infectious!', 'I love your enthusiasm for learning!');
            } else {
                replies.push('Your positive energy is amazing!', 'Keep that great spirit up!');
            }
        } else if (sentiment === 'negative') {
            replies.push(
                'I understand that might be frustrating',
                'Sometimes things don\'t go as planned, but that\'s okay',
                'Mushkil waqt hai, but it will pass'
            );
        } else {
            // Neutral but contextual
            if (messageText.length > 50) {
                replies.push('You\'re quite thoughtful in your messages', 'I appreciate the detail you share');
            }
        }

        return replies;
    }

    // Check if message is a question
    isQuestion(messageText) {
        const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'kya', 'kaise', 'kyun', 'kab', 'kahan', 'kaun', 'konsa'];
        return messageText.includes('?') || questionWords.some(word => messageText.includes(word));
    }

    // Generate intelligent question responses
    generateIntelligentQuestionResponses(messageText, conversationHistory) {
        const replies = [];
        
        // Analyze what type of question it is
        if (messageText.includes('think') || messageText.includes('sochte')) {
            const previousTopics = this.extractTopics(conversationHistory.slice(-5));
            if (previousTopics.length > 0) {
                replies.push(
                    `Based on our conversation, I think it relates to ${previousTopics[0]}`,
                    'That\'s a thought-provoking question!',
                    'Interesting perspective to think about!'
                );
            } else {
                replies.push(
                    'That\'s a great question to ponder!',
                    'What do you think about it?',
                    'Tumhara kya khayal hai?'
                );
            }
        }
        
        return replies;
    }

    // Generate intelligent fallback replies with conversation awareness
    generateIntelligentFallbackReplies(messageText, context, conversationHistory) {
        const fallbacks = [];

        // Base responses on conversation length and context
        if (conversationHistory.length < 3) {
            fallbacks.push(
                'Let\'s get to know each other better!',
                'This is the beginning of a great conversation!',
                'Chaliye baat shuru karte hain!'
            );
        } else if (conversationHistory.length > 10) {
            fallbacks.push(
                'We\'ve been chatting for a while! This is nice!',
                'I\'m enjoying our long conversation!',
                'Bahut achhi baat chal rahi hai!'
            );
        }

        // Based on message characteristics
        if (messageText.length > 100) {
            fallbacks.push('You always share such detailed thoughts!', 'I appreciate how expressive you are!');
        } else if (messageText.length < 10) {
            fallbacks.push('Short and sweet!', 'Sometimes less is more!', 'Kam mein baat ho gayi!');
        }

        // Conversation-specific fallbacks
        const uniqueParticipants = new Set(conversationHistory.map(msg => msg.from)).size;
        if (uniqueParticipants > 2) {
            fallbacks.push('Group conversations are always interesting!', 'Everyone brings something unique to the chat!');
        }

        // Default engaging responses with multilingual touch
        if (fallbacks.length === 0) {
            fallbacks.push(
                'That\'s really interesting!',
                'Tell me more about that!',
                'Aur batao, interesting lag raha hai!',
                'What\'s your take on this?',
                'I\'d love to hear more!'
            );
        }

        return fallbacks.slice(0, 3);
    }
}

module.exports = new AIAutoResponder();