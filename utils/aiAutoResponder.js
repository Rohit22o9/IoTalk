
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

    // Generate smart replies based on local patterns
    async generateSmartReplies(conversationHistory, maxReplies = 3) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return [];
        }

        const lastMessage = conversationHistory[conversationHistory.length - 1];
        const messageText = lastMessage.message.toLowerCase();

        const replies = [];

        // Check for specific greetings and common phrases
        if (messageText.includes('hello') || messageText.includes('hi') || messageText.includes('hey')) {
            replies.push('Hello!', 'Hey there!', 'Hi! How are you?');
        } else if (messageText.includes('how are you')) {
            replies.push('I\'m doing well, thanks!', 'Great, how about you?', 'All good here!');
        } else if (messageText.includes('thank')) {
            replies.push('You\'re welcome!', 'No problem!', 'Happy to help!');
        } else if (messageText.includes('good morning')) {
            replies.push('Good morning!', 'Morning! Have a great day!', 'Good morning to you too!');
        } else if (messageText.includes('good night') || messageText.includes('goodnight')) {
            replies.push('Good night!', 'Sweet dreams!', 'Night! Sleep well!');
        } else if (messageText.includes('what') && messageText.includes('doing')) {
            replies.push('Just chatting with you!', 'Not much, what about you?', 'Just here helping out!');
        } else if (messageText.includes('bye') || messageText.includes('goodbye')) {
            replies.push('Goodbye!', 'See you later!', 'Take care!');
        } else if (messageText.includes('?')) {
            // For questions, provide contextual responses
            if (messageText.includes('time')) {
                replies.push(`It's ${new Date().toLocaleTimeString()}`, 'Let me check the time for you');
            } else if (messageText.includes('weather')) {
                replies.push('I don\'t have weather info, but you could check a weather app!', 'Sorry, I can\'t check the weather right now');
            } else {
                replies.push(...this.smartReplyTemplates.question.slice(0, 2));
            }
        } else {
            // Check sentiment for other messages
            const sentiment = this.detectSentiment(lastMessage.message);
            if (sentiment === 'positive') {
                replies.push(...this.smartReplyTemplates.positive.slice(0, 2));
            } else if (sentiment === 'negative') {
                replies.push(...this.smartReplyTemplates.negative.slice(0, 2));
            } else {
                // For neutral messages, provide contextual acknowledgments
                replies.push('I see', 'Interesting', 'Got it', 'That makes sense');
            }
        }

        // Remove duplicates and limit
        const uniqueReplies = [...new Set(replies)];
        return uniqueReplies.slice(0, Math.min(maxReplies, uniqueReplies.length));
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
