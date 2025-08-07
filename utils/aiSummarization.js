
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

class AISummarization {
    constructor() {
        this.openaiApiKey = process.env.OPENAI_API_KEY;
    }

    // Summarize text using OpenAI GPT
    async summarizeText(text, maxLength = 100) {
        if (!this.openaiApiKey) {
            console.warn('OpenAI API key not configured');
            return null;
        }

        if (!text || text.length < 50) {
            return null; // Don't summarize very short texts
        }

        try {
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
                            content: `You are a helpful assistant that summarizes text concisely. Keep summaries under ${maxLength} characters and capture the main points.`
                        },
                        {
                            role: 'user',
                            content: `Please summarize this text: ${text}`
                        }
                    ],
                    max_tokens: 150,
                    temperature: 0.3
                })
            });

            const data = await response.json();
            
            if (data.choices && data.choices[0]) {
                return data.choices[0].message.content.trim();
            }
            
            return null;
        } catch (error) {
            console.error('Text summarization error:', error);
            return null;
        }
    }

    // Convert audio/video to text using OpenAI Whisper
    async transcribeAudio(audioPath) {
        if (!this.openaiApiKey) {
            console.warn('OpenAI API key not configured');
            return null;
        }

        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(audioPath));
            formData.append('model', 'whisper-1');
            formData.append('response_format', 'text');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.openaiApiKey}`,
                    ...formData.getHeaders()
                },
                body: formData
            });

            const transcription = await response.text();
            return transcription.trim();
        } catch (error) {
            console.error('Audio transcription error:', error);
            return null;
        }
    }

    // Summarize audio/video content
    async summarizeAudioVideo(mediaPath) {
        try {
            // First transcribe the audio
            const transcription = await this.transcribeAudio(mediaPath);
            
            if (!transcription || transcription.length < 50) {
                return null;
            }

            // Then summarize the transcription
            const summary = await this.summarizeText(transcription, 150);
            
            return {
                transcript: transcription,
                summary: summary
            };
        } catch (error) {
            console.error('Audio/Video summarization error:', error);
            return null;
        }
    }

    // Extract and summarize YouTube content (basic implementation)
    async summarizeYouTubeLink(url) {
        try {
            // Basic YouTube URL validation
            const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
            const match = url.match(youtubeRegex);
            
            if (!match) {
                return null;
            }

            const videoId = match[1];
            
            // This is a simplified implementation
            // In production, you would use YouTube Data API or youtube-transcript library
            return {
                summary: `YouTube video: ${url}`,
                videoId: videoId,
                note: 'YouTube transcript summarization requires additional API setup'
            };
        } catch (error) {
            console.error('YouTube summarization error:', error);
            return null;
        }
    }

    // Main summarization function
    async summarizeContent(content, type = 'text') {
        switch (type) {
            case 'text':
                return await this.summarizeText(content);
            case 'audio':
            case 'video':
                return await this.summarizeAudioVideo(content);
            case 'youtube':
                return await this.summarizeYouTubeLink(content);
            default:
                return null;
        }
    }

    // Check if content needs summarization
    shouldSummarize(content, type = 'text') {
        if (type === 'text') {
            return content && content.length > 200; // Summarize texts longer than 200 chars
        }
        
        if (type === 'audio' || type === 'video') {
            return true; // Always offer summarization for media
        }
        
        if (type === 'youtube') {
            const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)/;
            return youtubeRegex.test(content);
        }
        
        return false;
    }
}

module.exports = new AISummarization();
