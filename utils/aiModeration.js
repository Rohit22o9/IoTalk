
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class AIModeration {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.perspectiveApiKey = process.env.PERSPECTIVE_API_KEY;
    }

    // OpenAI Moderation API
    async moderateTextOpenAI(text) {
        if (!this.openaiApiKey) {
            console.warn('OpenAI API key not configured');
            return { flagged: false, categories: {} };
        }

        try {
            const response = await fetch('https://api.openai.com/v1/moderations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    input: text
                })
            });

            const data = await response.json();
            
            if (data.results && data.results[0]) {
                return {
                    flagged: data.results[0].flagged,
                    categories: data.results[0].categories,
                    categoryScores: data.results[0].category_scores
                };
            }
            
            return { flagged: false, categories: {} };
        } catch (error) {
            console.error('OpenAI moderation error:', error);
            return { flagged: false, categories: {} };
        }
    }

    // Perspective API (alternative)
    async moderateTextPerspective(text) {
        if (!this.perspectiveApiKey) {
            console.warn('Perspective API key not configured');
            return { flagged: false, score: 0 };
        }

        try {
            const response = await fetch(`https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${this.perspectiveApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requestedAttributes: {
                        TOXICITY: {},
                        SEVERE_TOXICITY: {},
                        IDENTITY_ATTACK: {},
                        INSULT: {},
                        PROFANITY: {},
                        THREAT: {}
                    },
                    comment: {
                        text: text
                    }
                })
            });

            const data = await response.json();
            
            if (data.attributeScores) {
                const toxicityScore = data.attributeScores.TOXICITY?.summaryScore?.value || 0;
                const severeToxicityScore = data.attributeScores.SEVERE_TOXICITY?.summaryScore?.value || 0;
                
                return {
                    flagged: toxicityScore > 0.7 || severeToxicityScore > 0.5,
                    score: Math.max(toxicityScore, severeToxicityScore),
                    scores: data.attributeScores
                };
            }
            
            return { flagged: false, score: 0 };
        } catch (error) {
            console.error('Perspective API error:', error);
            return { flagged: false, score: 0 };
        }
    }

    // Main text moderation function
    async moderateText(text) {
        if (!text || text.trim().length === 0) {
            return { flagged: false };
        }

        // Try OpenAI first, fallback to Perspective
        let result = await this.moderateTextOpenAI(text);
        
        if (!result.flagged && this.perspectiveApiKey) {
            const perspectiveResult = await this.moderateTextPerspective(text);
            if (perspectiveResult.flagged) {
                result = {
                    flagged: true,
                    source: 'perspective',
                    ...perspectiveResult
                };
            }
        }

        return result;
    }

    // Basic media content moderation (placeholder for Google Vision API)
    async moderateMedia(mediaPath, mediaType) {
        // This is a placeholder - you would integrate with Google Vision API
        // or similar services for actual image/video content analysis
        
        try {
            // For now, return safe for all media
            // In production, you would analyze the media content here
            return {
                flagged: false,
                categories: {},
                confidence: 0
            };
        } catch (error) {
            console.error('Media moderation error:', error);
            return { flagged: false };
        }
    }

    // Generate moderation notice message
    generateModerationNotice(moderationResult) {
        if (!moderationResult.flagged) return null;

        let reason = 'inappropriate content';
        
        if (moderationResult.categories) {
            const flaggedCategories = Object.keys(moderationResult.categories)
                .filter(cat => moderationResult.categories[cat]);
            
            if (flaggedCategories.length > 0) {
                reason = flaggedCategories.join(', ').replace(/_/g, ' ').toLowerCase();
            }
        }

        return `⚠️ Message was automatically removed due to ${reason}. Please keep conversations respectful and appropriate.`;
    }
}

module.exports = new AIModeration();
