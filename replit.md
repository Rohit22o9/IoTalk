# ModernChat Application

## Overview

ModernChat is a real-time chat application built with Node.js, Express, and Socket.IO. It features personal and group messaging, communities, voice/video calling with WebRTC, file sharing, and message encryption. The application includes AI-powered moderation and auto-response capabilities, all designed for deployment on Replit with optional desktop app packaging via Electron.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture
- **Web Framework**: Express.js server with EJS templating engine
- **Real-time Communication**: Socket.IO for instant messaging and call signaling
- **Session Management**: Express sessions with MongoDB store using connect-mongo
- **File Upload**: Multer middleware for handling media attachments
- **Security**: bcrypt for password hashing, custom AES-256-CBC encryption for sensitive data

### Database Design
- **Primary Database**: MongoDB with Mongoose ODM
- **Core Models**:
  - User: Encrypted email, profession, location fields with theme preferences
  - Chat: End-to-end encrypted messages with reactions, replies, and deletion tracking
  - Group/GroupChat: Community-based group messaging with polls and moderation
  - Call: Call history and participant tracking for audio/video calls
  - Community: Hierarchical organization with admin/moderator roles

### WebRTC Implementation
- **Peer-to-peer**: Direct audio/video calls between users
- **Group Calls**: Multi-participant calling with peer connection management
- **Signaling**: Socket.IO handles offer/answer exchange and ICE candidate relay
- **Media Handling**: getUserMedia for capture, addTrack for streaming, ontrack for receiving
- **STUN/TURN**: Google STUN servers configured for NAT traversal

### Frontend Architecture
- **UI Framework**: Tailwind CSS with custom animations and responsive design
- **Real-time Updates**: Socket.IO client for live messaging and call notifications
- **Media Features**: MediaRecorder API for voice messages, WebRTC for video calls
- **State Management**: Client-side JavaScript classes for call and notification management
- **PWA Support**: Service worker for background notifications and offline capabilities

### AI Integration
- **Content Moderation**: Local pattern matching for profanity, toxicity, and spam detection
- **Auto-response**: Context-aware bot responses with multilingual support (English/Hindi/Hinglish)
- **Text Summarization**: Extractive summarization using frequency analysis
- **Privacy-first**: All AI processing done locally without external API calls

### Security Features
- **Message Encryption**: AES-256-CBC encryption for chat messages and user data
- **Session Security**: Secure session management with MongoDB persistence
- **Input Validation**: Server-side validation and sanitization
- **Content Filtering**: AI-powered moderation with severity classification

### Deployment Architecture
- **Primary Target**: Replit deployment with environment variable configuration
- **Desktop App**: Electron wrapper that launches local server and opens browser window
- **Static Assets**: Public directory serving CSS, JavaScript, media files, and service worker
- **Process Management**: Automatic server startup in Electron main process

## External Dependencies

### Core Runtime
- **Node.js Runtime**: Express.js web server, Socket.IO real-time engine
- **Database**: MongoDB for data persistence, connect-mongo for session storage
- **Security**: bcrypt for password hashing, crypto module for message encryption

### Frontend Libraries
- **UI Framework**: Tailwind CSS for responsive design and styling
- **Real-time**: Socket.IO client for bidirectional communication
- **Media APIs**: WebRTC for peer-to-peer calls, MediaRecorder for voice messages

### File Handling
- **Upload Processing**: Multer for multipart form handling
- **File System**: Node.js fs module for media file management
- **Static Serving**: Express static middleware for asset delivery

### Development Tools
- **Desktop Packaging**: Electron for cross-platform desktop application
- **Environment**: dotenv for configuration management
- **Package Management**: npm with extensive dependency tree for build tools

### WebRTC Infrastructure
- **STUN Servers**: Google STUN servers (stun.l.google.com:19302)
- **ICE Handling**: Browser-native ICE candidate gathering and exchange
- **Media Constraints**: Browser getUserMedia API for audio/video capture

### AI Processing
- **Local Models**: Custom JavaScript implementations for moderation and summarization
- **Pattern Matching**: Regular expressions for content filtering and response generation
- **No External APIs**: All AI features implemented locally for privacy and reliability