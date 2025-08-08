
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
