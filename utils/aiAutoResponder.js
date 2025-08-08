
class AIAutoResponder {
    constructor() {
        this.enabledUsers = new Set();
        this.enabledGroups = new Set();
        
        // Local response patterns - completely privacy-focused
        this.loadResponsePatterns();
    }

    loadResponsePatterns() {
        // Greeting responses
        this.greetingPatterns = [
            { pattern: /^(hi|hello|hey|good morning|good evening)/i, responses: ['Hello!', 'Hi there!', 'Hey! How are you?', 'Good to see you!'] },
            { pattern: /how are you/i, responses: ['I\'m doing well, thanks!', 'All good here!', 'Great, thanks for asking!'] },
        ];

        // Question responses
        this.questionPatterns = [
            { pattern: /what time/i, responses: [`It's ${new Date().toLocaleTimeString()}`] },
            { pattern: /what day/i, responses: [`Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}`] },
            { pattern: /how to|help with|can you help/i, responses: ['I\'d be happy to help!', 'What do you need assistance with?', 'How can I help you?'] },
        ];

        // Sentiment-based responses
        this.positiveResponses = ['That\'s great!', 'Awesome!', 'Wonderful!', 'Nice!', 'That sounds good!'];
        this.negativeResponses = ['I\'m sorry to hear that.', 'That doesn\'t sound good.', 'I hope things get better.', 'Is there anything I can do to help?'];
        this.neutralResponses = ['I see.', 'Okay.', 'Got it.', 'Thanks for sharing.', 'Interesting.'];

        // Smart reply templates
        this.smartReplyTemplates = {
            question: ['Yes', 'No', 'Maybe', 'I think so', 'Not sure'],
            agreement: ['I agree', 'Exactly!', 'You\'re right', 'That makes sense'],
            acknowledgment: ['Thanks', 'Got it', 'Okay', 'Sure', 'Alright'],
            positive: ['Great!', 'Awesome!', 'Nice!', 'Cool!', 'Perfect!'],
            negative: ['Sorry to hear that', 'That\'s unfortunate', 'I understand', 'Hope it gets better']
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
        if (!conversationHistory || conversationHistory.length === 0) {
            return ['Hello!', 'How can I help?', 'What\'s on your mind?'];
        }

        const lastMessage = conversationHistory[conversationHistory.length - 1];
        const messageText = lastMessage.message.toLowerCase().trim();
        const replies = [];

        // Analyze the actual conversation flow with enhanced context
        const conversationContext = this.analyzeConversationContext(conversationHistory);
        
        // Generate contextual replies based on the last message
        const contextualReplies = this.generateContextualReplies(messageText, conversationContext);
        replies.push(...contextualReplies);

        // Analyze conversation patterns and flow
        if (conversationHistory.length > 1) {
            const recentMessages = conversationHistory.slice(-3);
            const topicReplies = this.generateTopicBasedReplies(recentMessages);
            replies.push(...topicReplies);

            // Add conversation flow based replies
            const flowReplies = this.generateConversationFlowReplies(conversationHistory);
            replies.push(...flowReplies);
        }

        // Add sentiment-based responses with context
        const sentiment = this.detectSentiment(messageText);
        const sentimentReplies = this.getSentimentReplies(sentiment, messageText);
        replies.push(...sentimentReplies);

        // Add time-aware responses
        const timeReplies = this.generateTimeAwareReplies(messageText);
        replies.push(...timeReplies);

        // Remove duplicates and limit, prioritizing more contextual responses
        const uniqueReplies = [...new Set(replies)];
        
        // If we have no good replies, generate fallback responses
        if (uniqueReplies.length === 0) {
            return this.generateFallbackReplies(messageText, conversationContext);
        }

        return uniqueReplies.slice(0, Math.min(maxReplies, uniqueReplies.length));
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

        // Handle specific greetings
        if (/^(hi|hello|hey)\b/i.test(messageText)) {
            if (context.topics.includes('time') || messageText.includes('morning')) {
                replies.push('Good morning!', 'Morning! Hope you have a great day!');
            } else if (messageText.includes('evening')) {
                replies.push('Good evening!', 'Evening! How was your day?');
            } else {
                replies.push('Hello there!', 'Hey! How are you doing?', 'Hi! What\'s up?');
            }
            return replies;
        }

        // Handle questions specifically
        if (messageText.includes('?')) {
            if (messageText.includes('how are you') || messageText.includes('how\'re you')) {
                replies.push('I\'m doing well, thanks! How about you?', 'Great, thanks for asking!', 'All good here! How are things with you?');
            } else if (messageText.includes('what are you doing') || messageText.includes('what\'re you doing')) {
                replies.push('Just chatting with you!', 'Not much, just here to help!', 'Having a nice conversation with you!');
            } else if (messageText.includes('how was your day') || messageText.includes('how\'s your day')) {
                replies.push('It\'s been good, thanks!', 'Pretty good day so far!', 'Going well, how about yours?');
            } else if (messageText.includes('what time') || messageText.includes('what\'s the time')) {
                replies.push(`It's ${new Date().toLocaleTimeString()}`, 'Let me check the time for you');
            } else if (messageText.includes('where') || messageText.includes('when') || messageText.includes('why')) {
                replies.push('That\'s a good question!', 'I\'m not sure about that', 'What do you think?');
            } else {
                // Generic question responses
                replies.push('Hmm, let me think about that', 'That\'s interesting!', 'Good question!');
            }
            return replies;
        }

        // Handle statements about activities
        if (messageText.includes('working') || messageText.includes('studying')) {
            replies.push('That sounds productive!', 'Hope it\'s going well!', 'What are you working on?');
        } else if (messageText.includes('eating') || messageText.includes('lunch') || messageText.includes('dinner')) {
            replies.push('Enjoy your meal!', 'What are you having?', 'That sounds tasty!');
        } else if (messageText.includes('watching') || messageText.includes('movie') || messageText.includes('show')) {
            replies.push('What are you watching?', 'Sounds entertaining!', 'Is it good?');
        } else if (messageText.includes('tired') || messageText.includes('sleepy')) {
            replies.push('You should get some rest!', 'Take care of yourself!', 'Maybe time for a break?');
        } else if (messageText.includes('excited') || messageText.includes('happy')) {
            replies.push('That\'s wonderful!', 'I\'m happy for you!', 'What\'s got you excited?');
        }

        // Handle thank you messages
        if (messageText.includes('thank') || messageText.includes('thanks')) {
            replies.push('You\'re welcome!', 'No problem!', 'Happy to help!', 'Anytime!');
            return replies;
        }

        // Handle goodbye messages
        if (messageText.includes('bye') || messageText.includes('see you') || messageText.includes('talk later')) {
            replies.push('Goodbye!', 'See you later!', 'Take care!', 'Talk to you soon!');
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

    // Simple sentiment detection using word analysis
    detectSentiment(message) {
        const positiveWords = [
            'happy', 'good', 'great', 'awesome', 'amazing', 'wonderful', 'fantastic',
            'excellent', 'perfect', 'love', 'like', 'enjoy', 'pleased', 'satisfied',
            'thankful', 'grateful', 'appreciate', 'brilliant', 'outstanding', 'marvelous'
        ];

        const negativeWords = [
            'sad', 'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate',
            'dislike', 'angry', 'mad', 'furious', 'disappointed', 'upset', 'annoyed',
            'frustrated', 'worried', 'concerned', 'troubled', 'depressed', 'miserable'
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

    extractTopics(messages) {
        const topicKeywords = {
            time: ['time', 'clock', 'hour', 'minute', 'when'],
            weather: ['weather', 'rain', 'sunny', 'cloudy', 'temperature', 'hot', 'cold'],
            food: ['eat', 'food', 'hungry', 'lunch', 'dinner', 'breakfast', 'restaurant'],
            work: ['work', 'job', 'office', 'meeting', 'project', 'task', 'deadline'],
            entertainment: ['movie', 'music', 'game', 'show', 'book', 'video', 'watch']
        };

        const foundTopics = [];
        const allText = messages.map(m => m.message.toLowerCase()).join(' ');

        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(keyword => allText.includes(keyword))) {
                foundTopics.push(topic);
            }
        }

        return foundTopics;
    }
}

module.exports = new AIAutoResponder();



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

    // Generate fallback replies when no contextual replies are found
    generateFallbackReplies(messageText, context) {
        const fallbacks = [];

        // Based on message length
        if (messageText.length > 100) {
            fallbacks.push('That\'s quite detailed!', 'I see what you mean', 'Thanks for sharing that');
        } else if (messageText.length < 10) {
            fallbacks.push('Could you tell me more?', 'What do you mean?', 'Can you elaborate?');
        }

        // Based on punctuation
        if (messageText.includes('!')) {
            fallbacks.push('That sounds exciting!', 'Wow!', 'That\'s great energy!');
        }

        if (messageText.includes('...')) {
            fallbacks.push('I\'m listening', 'Take your time', 'Go on...');
        }

        // Generic engaging responses
        if (fallbacks.length === 0) {
            fallbacks.push(
                'That\'s interesting!',
                'Tell me more about that',
                'How do you feel about that?',
                'What made you think of that?',
                'That\'s a good point'
            );
        }

        return fallbacks.slice(0, 3);
    }

    // Enhanced topic extraction with better keyword matching
    extractTopics(messages) {
        const topicKeywords = {
            time: ['time', 'clock', 'hour', 'minute', 'when', 'today', 'tomorrow', 'yesterday', 'now', 'later'],
            weather: ['weather', 'rain', 'sunny', 'cloudy', 'temperature', 'hot', 'cold', 'warm', 'snow', 'storm'],
            food: ['eat', 'food', 'hungry', 'lunch', 'dinner', 'breakfast', 'restaurant', 'cooking', 'recipe', 'delicious'],
            work: ['work', 'job', 'office', 'meeting', 'project', 'task', 'deadline', 'boss', 'colleague', 'business'],
            entertainment: ['movie', 'music', 'game', 'show', 'book', 'video', 'watch', 'play', 'fun', 'entertainment'],
            technology: ['computer', 'phone', 'app', 'software', 'internet', 'website', 'tech', 'digital', 'online'],
            travel: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'visit', 'journey', 'explore', 'destination'],
            health: ['health', 'doctor', 'medicine', 'exercise', 'gym', 'fit', 'sick', 'tired', 'rest', 'sleep'],
            family: ['family', 'mom', 'dad', 'parent', 'child', 'brother', 'sister', 'relative', 'home', 'house'],
            education: ['school', 'study', 'learn', 'class', 'teacher', 'student', 'exam', 'homework', 'university']
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
