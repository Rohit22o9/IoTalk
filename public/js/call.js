
// Call Management System for ModernChat
class CallManager {
    constructor() {
        this.socket = io();
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.isInCall = false;
        this.callType = null; // 'audio' or 'video'
        
        // WebRTC configuration with STUN servers for Replit
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        this.initializeEventListeners();
        console.log('CallManager initialized');
    }

    initializeEventListeners() {
        // Listen for incoming calls
        this.socket.on('incoming-call', (data) => {
            console.log('Incoming call received:', data);
            this.showIncomingCallNotification(data);
        });

        // Listen for call responses
        this.socket.on('call-accepted', (data) => {
            console.log('Call accepted:', data);
            this.handleCallAccepted(data);
        });

        this.socket.on('call-declined', (data) => {
            console.log('Call declined:', data);
            this.handleCallDeclined(data);
        });

        this.socket.on('call-ended', (data) => {
            console.log('Call ended:', data);
            this.endCall();
        });

        this.socket.on('call-cancelled', (data) => {
            console.log('Call cancelled:', data);
            this.hideCallNotification();
        });

        this.socket.on('call-timeout', (data) => {
            console.log('Call timeout:', data);
            this.handleCallTimeout();
        });

        this.socket.on('call-missed', (data) => {
            console.log('Call missed:', data);
            this.showMissedCallNotification(data);
        });

        // WebRTC signaling events
        this.socket.on('call-room-joined', (data) => {
            console.log('Successfully joined call room:', data.callId);
        });

        this.socket.on('call-offer', async (data) => {
            console.log('Received call offer:', data);
            await this.handleCallOffer(data);
        });

        this.socket.on('call-answer', async (data) => {
            console.log('Received call answer:', data);
            await this.handleCallAnswer(data);
        });

        this.socket.on('ice-candidate', (data) => {
            console.log('Received ICE candidate:', data);
            this.handleIceCandidate(data);
        });
    }

    async initiateCall(receiverId, type) {
        console.log(`Initiating ${type} call to user ${receiverId}`);
        
        try {
            // Start the call request
            const response = await fetch('/call/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ receiverId, type })
            });

            const result = await response.json();
            console.log('Call initiate response:', result);

            if (result.success) {
                this.currentCall = {
                    callId: result.callId,
                    receiverId: receiverId,
                    type: type,
                    role: 'caller'
                };
                this.callType = type;
                
                // Get user media
                await this.getUserMedia(type);
                
                // Show calling interface immediately
                this.showCallingInterface(receiverId, type);
                
                console.log('Call initiated successfully, showing UI');
            } else {
                alert(result.error || 'Failed to initiate call');
            }
        } catch (error) {
            console.error('Error initiating call:', error);
            alert('Failed to start call');
        }
    }

    async getUserMedia(type) {
        const constraints = {
            audio: true,
            video: type === 'video'
        };

        try {
            console.log('Getting user media with constraints:', constraints);
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Successfully got user media');
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            throw error;
        }
    }

    showCallingInterface(receiverId, type) {
        console.log(`Showing calling interface for ${type} call`);
        
        // Remove any existing call interface
        this.hideCallInterface();
        
        const callInterface = document.createElement('div');
        callInterface.id = 'call-interface';
        callInterface.className = 'fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center';
        
        callInterface.innerHTML = `
            <div class="text-center text-white">
                <div class="mb-8">
                    <div class="w-32 h-32 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"></path>
                        </svg>
                    </div>
                    <h2 class="text-2xl font-semibold mb-2">Calling...</h2>
                    <p class="text-gray-300">${type === 'video' ? 'Video' : 'Audio'} Call</p>
                </div>
                
                <div class="flex justify-center space-x-6">
                    <button onclick="callManager.cancelCall()" 
                            class="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Local video for video calls -->
            <div id="local-video-container" class="absolute bottom-4 right-4" style="display: ${type === 'video' ? 'block' : 'none'}">
                <video id="local-video" autoplay muted class="w-48 h-36 bg-gray-800 rounded-lg"></video>
            </div>
            
            <!-- Remote video container -->
            <div id="remote-video-container" class="absolute inset-0 flex items-center justify-center" style="display: none;">
                <video id="remote-video" autoplay class="max-w-full max-h-full"></video>
            </div>
        `;
        
        document.body.appendChild(callInterface);
        
        // Set local video stream if available
        if (this.localStream && type === 'video') {
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
        }
    }

    showIncomingCallNotification(data) {
        console.log('Showing incoming call notification');
        
        // Hide any existing notification
        this.hideCallNotification();
        
        const notification = document.createElement('div');
        notification.id = 'incoming-call-notification';
        notification.className = 'fixed inset-0 bg-gray-900 bg-opacity-95 z-50 flex items-center justify-center';
        
        notification.innerHTML = `
            <div class="bg-white rounded-lg p-8 text-center max-w-md mx-4">
                <div class="mb-6">
                    <img src="${data.caller.avatar || '/icons/user-default.png'}" alt="${data.caller.username}" 
                         class="w-20 h-20 rounded-full mx-auto mb-4">
                    <h3 class="text-xl font-semibold mb-2">${data.caller.username}</h3>
                    <p class="text-gray-600">Incoming ${data.type} call</p>
                </div>
                
                <div class="flex justify-center space-x-6">
                    <button onclick="callManager.acceptCall('${data.callId}', '${data.type}')" 
                            class="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full transition-colors">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                        </svg>
                    </button>
                    <button onclick="callManager.declineCall('${data.callId}')" 
                            class="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
    }

    async acceptCall(callId, type) {
        console.log(`Accepting ${type} call ${callId}`);
        
        try {
            // Get user media first
            await this.getUserMedia(type);
            
            // Send accept response
            const response = await fetch(`/call/${callId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'accept' })
            });

            if (response.ok) {
                this.currentCall = {
                    callId: callId,
                    type: type,
                    role: 'receiver'
                };
                this.callType = type;
                
                // Hide notification and show call interface
                this.hideCallNotification();
                this.showActiveCallInterface(type);
                
                // Create peer connection and wait for offer
                await this.createPeerConnection();
                
                console.log('Call accepted, waiting for offer');
            }
        } catch (error) {
            console.error('Error accepting call:', error);
            alert('Failed to accept call');
        }
    }

    async declineCall(callId) {
        console.log(`Declining call ${callId}`);
        
        try {
            await fetch(`/call/${callId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'decline' })
            });
            
            this.hideCallNotification();
        } catch (error) {
            console.error('Error declining call:', error);
        }
    }

    async cancelCall() {
        console.log('Cancelling call');
        
        if (this.currentCall) {
            try {
                await fetch(`/call/${this.currentCall.callId}/cancel`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('Error cancelling call:', error);
            }
        }
        
        this.endCall();
    }

    async endCall() {
        console.log('Ending call');
        
        if (this.currentCall) {
            try {
                await fetch(`/call/${this.currentCall.callId}/end`, {
                    method: 'POST'
                });
            } catch (error) {
                console.error('Error ending call:', error);
            }
        }
        
        // Clean up
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        this.hideCallInterface();
        this.hideCallNotification();
        
        this.currentCall = null;
        this.isInCall = false;
        this.callType = null;
    }

    showActiveCallInterface(type) {
        console.log(`Showing active call interface for ${type} call`);
        
        this.hideCallInterface();
        
        const callInterface = document.createElement('div');
        callInterface.id = 'call-interface';
        callInterface.className = 'fixed inset-0 bg-gray-900 z-50 flex flex-col';
        
        callInterface.innerHTML = `
            <!-- Remote video/audio container -->
            <div class="flex-1 flex items-center justify-center bg-gray-800">
                <video id="remote-video" autoplay class="max-w-full max-h-full" style="display: ${type === 'video' ? 'block' : 'none'}"></video>
                <div id="audio-indicator" class="text-white text-center" style="display: ${type === 'audio' ? 'block' : 'none'}">
                    <svg class="w-32 h-32 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"></path>
                    </svg>
                    <p class="text-xl">In call...</p>
                </div>
            </div>
            
            <!-- Local video for video calls -->
            <div id="local-video-container" class="absolute bottom-20 right-4" style="display: ${type === 'video' ? 'block' : 'none'}">
                <video id="local-video" autoplay muted class="w-48 h-36 bg-gray-700 rounded-lg"></video>
            </div>
            
            <!-- Call controls -->
            <div class="bg-gray-800 p-6 flex justify-center space-x-6">
                <button id="toggle-audio" onclick="callManager.toggleAudio()" 
                        class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-full transition-colors">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"></path>
                    </svg>
                </button>
                
                <button id="toggle-video" onclick="callManager.toggleVideo()" 
                        class="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-full transition-colors"
                        style="display: ${type === 'video' ? 'block' : 'none'}">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path>
                    </svg>
                </button>
                
                <button onclick="callManager.endCall()" 
                        class="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
        `;
        
        document.body.appendChild(callInterface);
        
        // Set local video stream
        if (this.localStream) {
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
        }
        
        this.isInCall = true;
    }

    async createPeerConnection() {
        console.log('Creating peer connection with config:', this.pcConfig);
        
        this.peerConnection = new RTCPeerConnection(this.pcConfig);
        
        // Add connection state listeners for debugging
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state changed:', this.peerConnection.connectionState);
        };
        
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state changed:', this.peerConnection.iceConnectionState);
        };
        
        this.peerConnection.onicegatheringstatechange = () => {
            console.log('ICE gathering state changed:', this.peerConnection.iceGatheringState);
        };
        
        // Add local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                console.log('Adding track to peer connection:', track.kind);
                this.peerConnection.addTrack(track, this.localStream);
            });
        }
        
        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('Received remote stream tracks:', event.streams.length);
            const [remoteStream] = event.streams;
            this.remoteStream = remoteStream;
            
            const remoteVideo = document.getElementById('remote-video');
            if (remoteVideo) {
                remoteVideo.srcObject = remoteStream;
                console.log('Set remote video stream');
            }
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate:', event.candidate.candidate);
                this.socket.emit('ice-candidate', {
                    callId: this.currentCall.callId,
                    candidate: event.candidate
                });
            } else {
                console.log('ICE gathering completed');
            }
        };
        
        return this.peerConnection;
    }

    async handleCallAccepted(data) {
        console.log('Call was accepted, creating offer');
        
        try {
            // Create peer connection
            await this.createPeerConnection();
            
            // Join the call room for signaling
            this.socket.emit('join-call-room', this.currentCall.callId);
            
            // Create and send offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            console.log('Sending call offer');
            this.socket.emit('call-offer', {
                callId: this.currentCall.callId,
                offer: offer
            });
            
            // Update UI to active call
            this.showActiveCallInterface(this.callType);
            
        } catch (error) {
            console.error('Error handling call accepted:', error);
        }
    }

    async handleCallOffer(data) {
        console.log('Handling call offer');
        
        try {
            if (!this.peerConnection) {
                await this.createPeerConnection();
            }
            
            // Join the call room
            this.socket.emit('join-call-room', data.callId);
            
            // Set remote description
            await this.peerConnection.setRemoteDescription(data.offer);
            
            // Create and send answer
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            console.log('Sending call answer');
            this.socket.emit('call-answer', {
                callId: data.callId,
                answer: answer
            });
            
        } catch (error) {
            console.error('Error handling call offer:', error);
        }
    }

    async handleCallAnswer(data) {
        console.log('Handling call answer');
        
        try {
            await this.peerConnection.setRemoteDescription(data.answer);
        } catch (error) {
            console.error('Error handling call answer:', error);
        }
    }

    async handleIceCandidate(data) {
        console.log('Handling ICE candidate');
        
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(data.candidate);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    handleCallDeclined(data) {
        console.log('Call was declined');
        this.hideCallInterface();
        this.currentCall = null;
        alert('Call was declined');
    }

    handleCallTimeout() {
        console.log('Call timed out');
        this.hideCallInterface();
        this.currentCall = null;
        alert('Call timed out');
    }

    showMissedCallNotification(data) {
        console.log('Showing missed call notification');
        // You can implement a missed call notification here
    }

    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const button = document.getElementById('toggle-audio');
                if (button) {
                    button.classList.toggle('bg-red-500', !audioTrack.enabled);
                    button.classList.toggle('bg-gray-600', audioTrack.enabled);
                }
            }
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                const button = document.getElementById('toggle-video');
                if (button) {
                    button.classList.toggle('bg-red-500', !videoTrack.enabled);
                    button.classList.toggle('bg-gray-600', videoTrack.enabled);
                }
            }
        }
    }

    hideCallInterface() {
        const callInterface = document.getElementById('call-interface');
        if (callInterface) {
            callInterface.remove();
        }
    }

    hideCallNotification() {
        const notification = document.getElementById('incoming-call-notification');
        if (notification) {
            notification.remove();
        }
    }
}

// Initialize call manager
let callManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof io !== 'undefined') {
        // Wait a bit to ensure other scripts have loaded
        setTimeout(() => {
            callManager = new CallManager();
            window.callManager = callManager; // Make it globally accessible
            console.log('Call manager initialized and set globally');
        }, 100);
    } else {
        console.error('Socket.IO not loaded');
    }
});

// Also make it available immediately if called before DOM ready
window.initializeCallManager = function() {
    if (!window.callManager && typeof io !== 'undefined') {
        callManager = new CallManager();
        window.callManager = callManager;
        console.log('Call manager initialized via manual call');
    }
};
