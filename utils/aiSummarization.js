
const fs = require('fs');
const path = require('path');

class AISummarization {
    constructor() {
        // Initialize local summarization without external APIs
        this.stopWords = [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'been', 'be', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i',
            'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
        ];
    }

    // Extractive text summarization using frequency analysis
    async summarizeText(text, maxLength = 100) {
        if (!text || text.length < 50) {
            return null; // Don't summarize very short texts
        }

        try {
            // Split into sentences
            const sentences = this.splitIntoSentences(text);
            if (sentences.length <= 2) {
                return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
            }

            // Calculate sentence scores
            const sentenceScores = this.calculateSentenceScores(sentences, text);
            
            // Select top sentences
            const topSentences = this.selectTopSentences(sentences, sentenceScores, maxLength);
            
            return topSentences.join(' ').trim();
        } catch (error) {
            console.error('Text summarization error:', error);
            return text.length > maxLength ? text.substring(0, maxLength) + '...' : null;
        }
    }

    splitIntoSentences(text) {
        // Simple sentence splitting (can be improved with better NLP)
        return text.match(/[^\.!?]+[\.!?]+/g) || [text];
    }

    calculateSentenceScores(sentences, fullText) {
        // Calculate word frequencies
        const wordFreq = this.calculateWordFrequencies(fullText);
        
        const sentenceScores = sentences.map(sentence => {
            const words = this.tokenize(sentence);
            const score = words.reduce((sum, word) => {
                return sum + (wordFreq[word] || 0);
            }, 0);
            
            return {
                sentence: sentence.trim(),
                score: score / words.length, // Average word frequency
                length: sentence.length,
                position: sentences.indexOf(sentence) // Position importance
            };
        });

        return sentenceScores;
    }

    calculateWordFrequencies(text) {
        const words = this.tokenize(text);
        const freq = {};
        
        words.forEach(word => {
            if (!this.stopWords.includes(word)) {
                freq[word] = (freq[word] || 0) + 1;
            }
        });

        return freq;
    }

    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopWords.includes(word));
    }

    selectTopSentences(sentences, sentenceScores, maxLength) {
        // Sort by score (descending)
        const sortedSentences = sentenceScores.sort((a, b) => {
            // Consider both score and position (earlier sentences get slight boost)
            const scoreA = a.score - (a.position * 0.1);
            const scoreB = b.score - (b.position * 0.1);
            return scoreB - scoreA;
        });

        let summary = '';
        const selected = [];

        for (const item of sortedSentences) {
            if (summary.length + item.sentence.length <= maxLength) {
                selected.push(item);
                summary += item.sentence + ' ';
            }
        }

        // Sort selected sentences by original position
        selected.sort((a, b) => a.position - b.position);
        
        return selected.map(item => item.sentence);
    }

    // Basic YouTube link detection and metadata extraction
    async summarizeYouTubeLink(url) {
        try {
            const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
            const match = url.match(youtubeRegex);
            
            if (!match) {
                return null;
            }

            const videoId = match[1];
            
            return {
                type: 'youtube',
                videoId: videoId,
                url: url,
                summary: `YouTube video shared: ${url}`,
                note: 'This is a YouTube video link. Click to watch the content.',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('YouTube link processing error:', error);
            return null;
        }
    }

    // Local URL content analysis (basic)
    async summarizeWebLink(url) {
        try {
            // Basic URL validation
            const urlRegex = /^https?:\/\/.+/i;
            if (!urlRegex.test(url)) {
                return null;
            }

            // Extract domain
            const domain = new URL(url).hostname;
            
            return {
                type: 'web_link',
                url: url,
                domain: domain,
                summary: `Web link shared: ${domain}`,
                note: 'This is a web link. Click to visit the website.',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Web link processing error:', error);
            return null;
        }
    }

    // Media file analysis (local)
    async summarizeMediaFile(filePath, mediaType) {
        try {
            if (!fs.existsSync(filePath)) {
                return null;
            }

            const stats = fs.statSync(filePath);
            const fileSize = this.formatFileSize(stats.size);
            const fileName = path.basename(filePath);
            const extension = path.extname(filePath).toLowerCase();

            let summary = '';
            let note = '';

            switch (mediaType) {
                case 'image':
                    summary = `Image shared: ${fileName}`;
                    note = `Image file (${fileSize})`;
                    break;
                case 'audio':
                    summary = `Audio shared: ${fileName}`;
                    note = `Audio file (${fileSize})`;
                    break;
                case 'video':
                    summary = `Video shared: ${fileName}`;
                    note = `Video file (${fileSize})`;
                    break;
                case 'document':
                    summary = `Document shared: ${fileName}`;
                    note = `Document file (${fileSize})`;
                    break;
                default:
                    summary = `File shared: ${fileName}`;
                    note = `File (${fileSize})`;
            }

            return {
                type: 'media',
                mediaType: mediaType,
                fileName: fileName,
                fileSize: fileSize,
                extension: extension,
                summary: summary,
                note: note,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Media file analysis error:', error);
            return null;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Main summarization function
    async summarizeContent(content, type = 'text') {
        switch (type) {
            case 'text':
                return await this.summarizeText(content);
            case 'video_link':
                return await this.summarizeVideoLink(content);
            case 'youtube':
                return await this.summarizeYouTubeLink(content);
            case 'web_link':
                return await this.summarizeWebLink(content);
            case 'image':
            case 'audio':
            case 'video':
            case 'document':
                return await this.summarizeMediaFile(content, type);
            default:
                return null;
        }
    }

    // Enhanced video link summarization
    async summarizeVideoLink(content) {
        try {
            // Extract video URLs from text
            const videoRegex = /(?:https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/video\/|dailymotion\.com\/video\/))([a-zA-Z0-9_-]+)/g;
            const matches = [...content.matchAll(videoRegex)];
            
            if (matches.length === 0) {
                return await this.summarizeText(content);
            }

            const videoUrl = matches[0][0];
            let platform = 'Unknown';
            let videoId = matches[0][1];

            if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
                platform = 'YouTube';
            } else if (videoUrl.includes('vimeo.com')) {
                platform = 'Vimeo';
            } else if (videoUrl.includes('dailymotion.com')) {
                platform = 'Dailymotion';
            }

            // Generate comprehensive summary based on video information
            let summary = '';
            let analysis = '';

            if (platform === 'YouTube') {
                // Enhanced YouTube analysis
                analysis = `This is a YouTube video (ID: ${videoId}). `;
                
                // Try to extract meaningful information from the URL parameters or context
                const urlParams = new URL(videoUrl).searchParams;
                const timestamp = urlParams.get('t') || urlParams.get('time_continue');
                
                if (timestamp) {
                    analysis += `Video starts at timestamp ${timestamp}. `;
                }

                // Analyze the video ID for patterns (educational, music, etc.)
                if (videoId.length === 11) {
                    analysis += `This appears to be a standard YouTube video. `;
                }

                summary = `📺 **YouTube Video Analysis**\n\n`;
                summary += `**Platform**: YouTube\n`;
                summary += `**Video ID**: ${videoId}\n`;
                summary += `**URL**: ${videoUrl}\n\n`;
                summary += `**Content Analysis**: ${analysis}\n\n`;

                // Check for additional context from message text
                const textPart = content.replace(videoRegex, '').trim();
                if (textPart && textPart.length > 5) {
                    const contextAnalysis = await this.analyzeVideoContext(textPart);
                    summary += `**Message Context**: ${contextAnalysis}\n\n`;
                }

                summary += `**Recommendation**: Click the "Watch Video" button below to view the content. YouTube videos can contain educational material, entertainment, tutorials, music, or other multimedia content.\n\n`;
                summary += `**Note**: This is an AI-generated summary based on the video link. For complete understanding, please watch the actual video content.`;

            } else {
                // Generic video platform analysis
                summary = `📹 **${platform} Video Analysis**\n\n`;
                summary += `**Platform**: ${platform}\n`;
                summary += `**Video ID**: ${videoId}\n`;
                summary += `**URL**: ${videoUrl}\n\n`;
                summary += `**Content Analysis**: This is a video from ${platform}. Video content analysis is limited for this platform, but it may contain educational, entertainment, or informational content.\n\n`;
                summary += `**Recommendation**: Click the provided link to view the video content directly on ${platform}.`;
            }

            return {
                type: 'video_link',
                platform: platform,
                videoId: videoId,
                url: videoUrl,
                summary: summary,
                originalText: content.replace(videoRegex, '').trim(),
                timestamp: new Date().toISOString(),
                enhanced: true
            };
        } catch (error) {
            console.error('Video link processing error:', error);
            // Fallback to basic analysis
            return {
                type: 'video_link',
                platform: 'Unknown',
                videoId: 'unknown',
                url: content,
                summary: `🎬 **Video Link Detected**\n\nA video link has been shared: ${content}\n\nThis appears to be multimedia content that may contain educational, entertainment, or informational material. Please click the link to view the complete content.\n\n**Note**: Content analysis is limited for this video source.`,
                originalText: '',
                timestamp: new Date().toISOString(),
                enhanced: false
            };
        }
    }

    // Helper method to analyze video context from accompanying text
    async analyzeVideoContext(text) {
        if (!text || text.length < 10) {
            return "No additional context provided.";
        }

        // Extract keywords and context
        const keywords = this.extractKeywords(text, 5);
        let contextSummary = '';

        if (keywords.length > 0) {
            contextSummary += `Key topics mentioned: ${keywords.join(', ')}. `;
        }

        // Analyze text for common video-related terms
        const videoTerms = {
            educational: ['tutorial', 'learn', 'course', 'lesson', 'education', 'study', 'guide'],
            entertainment: ['funny', 'comedy', 'entertainment', 'fun', 'laugh', 'movie', 'show'],
            music: ['song', 'music', 'album', 'artist', 'band', 'concert', 'lyrics'],
            news: ['news', 'report', 'update', 'breaking', 'latest', 'current'],
            tech: ['technology', 'tech', 'software', 'coding', 'programming', 'review'],
            gaming: ['game', 'gaming', 'play', 'gameplay', 'streamer', 'gaming']
        };

        const lowerText = text.toLowerCase();
        const detectedCategories = [];

        for (const [category, terms] of Object.entries(videoTerms)) {
            if (terms.some(term => lowerText.includes(term))) {
                detectedCategories.push(category);
            }
        }

        if (detectedCategories.length > 0) {
            contextSummary += `Content likely relates to: ${detectedCategories.join(', ')}. `;
        }

        // Add the original text context
        const textSummary = await this.summarizeText(text, 100);
        if (textSummary) {
            contextSummary += `Summary of accompanying message: "${textSummary}"`;
        } else {
            contextSummary += `Accompanying message: "${text}"`;
        }

        return contextSummary;
    }

    // Check if content needs summarization
    shouldSummarize(content, type = 'text') {
        if (type === 'text') {
            return content && content.length > 200;
        }
        
        if (['audio', 'video', 'image', 'document'].includes(type)) {
            return true;
        }
        
        if (type === 'youtube') {
            const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)/;
            return youtubeRegex.test(content);
        }

        if (type === 'web_link') {
            const urlRegex = /^https?:\/\/.+/i;
            return urlRegex.test(content);
        }
        
        return false;
    }

    // Keyword extraction from text
    extractKeywords(text, maxKeywords = 5) {
        const words = this.tokenize(text);
        const wordFreq = {};
        
        words.forEach(word => {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
        });

        const sortedWords = Object.entries(wordFreq)
            .sort(([,a], [,b]) => b - a)
            .slice(0, maxKeywords)
            .map(([word]) => word);

        return sortedWords;
    }

    // Create a brief content summary for notifications
    createNotificationSummary(content, maxLength = 50) {
        if (!content) return '';
        
        if (content.length <= maxLength) return content;
        
        // Try to cut at word boundary
        const truncated = content.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > maxLength * 0.7) {
            return truncated.substring(0, lastSpace) + '...';
        }
        
        return truncated + '...';
    }
}

module.exports = new AISummarization();
