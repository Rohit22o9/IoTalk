const fetch = require('node-fetch');

class AIAutoResponder {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.enabledUsers = new Set(); // Users who have enabled auto-responder
        this.enabledGroups = new Set(); // Groups with auto-responder enabled
    }

    // Enable/disable auto-responder for user
    toggleUserAutoResponder(userId, enabled) {
        if (enabled) {
            this.enabledUsers.add(userId);
        } else {
            this.enabledUsers.delete(userId);
        }
    }

    // Enable/disable auto-responder for group
    toggleGroupAutoResponder(groupId, enabled) {
        if (enabled) {
            this.enabledGroups.add(groupId);
        } else {
            this.enabledGroups.delete(groupId);
        }
    }

    // Check if auto-responder is enabled
    isEnabled(userId, groupId = null) {
        if (groupId) {
            return this.enabledGroups.has(groupId);
        }
        return this.enabledUsers.has(userId);
    }

    // Generate smart replies for personal chats
    async generateSmartReplies(conversationHistory, maxReplies = 3) {
        if (!this.openaiApiKey) {
            return [];
        }

        try {
            const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a helpful assistant that generates ${maxReplies} short, appropriate smart replies for a chat conversation. Each reply should be different in tone and length. Return only the replies, one per line, without numbering or formatting.`
                        },
                        {
                            role: 'user',
                            content: `Based on this conversation context, generate ${maxReplies} possible replies:\n${context}`
                        }
                    ],
                    max_tokens: 100,
                    temperature: 0.8
                })
            });

            const data = await response.json();

            if (data.choices && data.choices[0]) {
                const replies = data.choices[0].message.content
                    .trim()
                    .split('\n')
                    .filter(reply => reply.trim().length > 0)
                    .slice(0, maxReplies);

                return replies;
            }

            return [];
        } catch (error) {
            console.error('Smart replies generation error:', error);
            return [];
        }
    }

    // Generate AI response for group chats (when tagged or asked question)
    async generateGroupResponse(message, conversationHistory, username) {
        if (!this.openaiApiKey) {
            return null;
        }

        try {
            const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: `You are ModernBot, a helpful assistant in a group chat. 
                                    Provide helpful, concise responses. Be friendly but not overly chatty.
                                    Current user context: The message is from ${username}.
                                    Group conversation context: ${context}`
                        },
                        {
                            role: 'user',
                            content: message
                        }
                    ],
                    max_tokens: 150,
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (data.choices && data.choices[0]) {
                return data.choices[0].message.content.trim();
            }

            return null;
        } catch (error) {
            console.error('Group response generation error:', error);
            return null;
        }
    }

    // Check if message should trigger group AI response
    shouldRespondInGroup(message) {
        const lowerMessage = message.toLowerCase();

        // Respond if tagged
        if (lowerMessage.includes('@modernbot') || lowerMessage.includes('modernbot')) {
            return true;
        }

        // Respond to clear questions
        const questionPatterns = [
            /what\s+(is|are|do|does|can|will|would)/,
            /how\s+(do|does|can|to|much|many)/,
            /when\s+(is|are|do|does|will|would)/,
            /where\s+(is|are|do|does|can)/,
            /why\s+(is|are|do|does|did)/,
            /who\s+(is|are|can|will|would)/,
            /\?$/
        ];

        return questionPatterns.some(pattern => pattern.test(lowerMessage));
    }

    // Detect sentiment (basic implementation)
    detectSentiment(message) {
        const positiveWords = ['happy', 'good', 'great', 'awesome', 'amazing', 'love', 'like', 'thanks', 'thank you'];
        const negativeWords = ['sad', 'bad', 'hate', 'angry', 'upset', 'terrible', 'awful', 'disappointed'];

        const words = message.toLowerCase().split(/\s+/);
        const positiveCount = words.filter(word => positiveWords.includes(word)).length;
        const negativeCount = words.filter(word => negativeWords.includes(word)).length;

        if (positiveCount > negativeCount) return 'positive';
        if (negativeCount > positiveCount) return 'negative';
        return 'neutral';
    }
}

module.exports = new AIAutoResponder();