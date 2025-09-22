
// Clean WebRTC Calling System
class CallManager {
    constructor() {
        this.socket = window.socket || io();
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.callTimer = null;
        this.callStartTime = null;
        
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        this.initializeEventListeners();
        console.log('📞 CallManager initialized');
    }

    initializeEventListeners() {
        // Incoming call events
        this.socket.on('incoming-call', (data) => {
            console.log('📞 Incoming call:', data);
            this.showIncomingCallNotification(data);
        });

        this.socket.on('call-accepted', (data) => {
            console.log('📞 Call accepted:', data);
            this.handleCallAccepted(data);
        });

        this.socket.on('call-declined', (data) => {
            console.log('📞 Call declined');
            this.handleCallDeclined();
        });

        this.socket.on('call-timeout', (data) => {
            console.log('📞 Call timeout');
            this.handleCallTimeout();
        });

        this.socket.on('call-missed', (data) => {
            console.log('📞 Call missed');
            this.hideCallNotification();
        });

        this.socket.on('call-ended', (data) => {
            console.log('📞 Call ended');
            this.endCall();
        });

        // WebRTC signaling events
        this.socket.on('call-user', async (data) => {
            console.log('📥 Received offer');
            await this.handleOffer(data);
        });

        this.socket.on('call-accepted', async (data) => {
            if (data.answer) {
                console.log('📥 Received answer');
                await this.handleAnswer(data);
            }
        });

        this.socket.on('ice-candidate', async (data) => {
            console.log('📥 Received ICE candidate');
            await this.handleIceCandidate(data);
        });

        this.socket.on('end-call', (data) => {
            console.log('📞 Call ended by peer');
            this.endCall();
        });
    }

    async startCall(receiverId, type = 'audio') {
        try {
            console.log('📞 Starting call to:', receiverId);
            
            // Get user media first
            await this.getUserMedia(type);
            
            // Initiate call on server
            const response = await fetch('/call/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId, type })
            });

            const result = await response.json();
            if (result.success) {
                this.currentCall = {
                    callId: result.callId,
                    receiverId: receiverId,
                    type: type,
                    isInitiator: true
                };
                
                this.showOutgoingCallInterface();
                console.log('📞 Call initiated:', result.callId);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ Error starting call:', error);
            this.releaseMedia();
            alert('Failed to start call: ' + error.message);
        }
    }

    async acceptCall(callData) {
        try {
            console.log('📞 Accepting call:', callData.callId);
            
            // Get user media
            await this.getUserMedia(callData.type);
            
            this.currentCall = {
                callId: callData.callId,
                callerId: callData.caller.id,
                type: callData.type,
                isInitiator: false
            };

            // Accept call on server
            const response = await fetch(`/call/${callData.callId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept' })
            });

            if (response.ok) {
                this.hideCallNotification();
                this.showInCallInterface();
                console.log('📞 Call accepted');
            } else {
                throw new Error('Failed to accept call');
            }
        } catch (error) {
            console.error('❌ Error accepting call:', error);
            this.releaseMedia();
            alert('Failed to accept call');
        }
    }

    async declineCall(callId) {
        try {
            await fetch(`/call/${callId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline' })
            });
            this.hideCallNotification();
        } catch (error) {
            console.error('❌ Error declining call:', error);
        }
    }

    async getUserMedia(type) {
        try {
            console.log('🎤 Getting user media...');
            
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: type === 'video'
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ User media obtained');
            
            return this.localStream;
        } catch (error) {
            console.error('❌ Error getting user media:', error);
            if (error.name === 'NotAllowedError') {
                alert('Please allow microphone access');
            }
            throw error;
        }
    }

    createPeerConnection() {
        console.log('🔗 Creating peer connection');
        
        this.peerConnection = new RTCPeerConnection(this.pcConfig);

        // Add local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('📥 Received remote track');
            this.remoteStream = event.streams[0];
            this.setupRemoteAudio(this.remoteStream);
            this.updateCallStatus('Connected');
            this.startCallTimer();
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate');
                this.socket.emit('ice-candidate', {
                    callId: this.currentCall.callId,
                    candidate: event.candidate
                });
            }
        };

        // Connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('🔗 Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                this.updateCallStatus('Connected');
                this.startCallTimer();
            } else if (this.peerConnection.connectionState === 'failed') {
                console.error('❌ Connection failed');
                this.endCall();
            }
        };

        return this.peerConnection;
    }

    setupRemoteAudio(remoteStream) {
        console.log('🔊 Setting up remote audio');
        
        // Remove existing audio element
        const existingAudio = document.getElementById('remote-audio');
        if (existingAudio) {
            existingAudio.remove();
        }

        // Create new audio element
        const audio = document.createElement('audio');
        audio.id = 'remote-audio';
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.playsInline = true;
        audio.volume = 1.0;
        
        // Hide but keep functional
        audio.style.display = 'none';
        document.body.appendChild(audio);

        audio.onloadedmetadata = () => {
            audio.play().catch(err => {
                console.error('Audio play failed:', err);
            });
        };

        console.log('✅ Remote audio setup complete');
    }

    async handleCallAccepted(data) {
        try {
            console.log('📞 Call accepted, creating offer');
            
            this.showInCallInterface();
            this.createPeerConnection();
            
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('call-user', {
                callId: this.currentCall.callId,
                offer: offer
            });
            
        } catch (error) {
            console.error('❌ Error handling call acceptance:', error);
            this.endCall();
        }
    }

    async handleOffer(data) {
        try {
            console.log('📥 Handling offer');
            
            this.createPeerConnection();
            
            await this.peerConnection.setRemoteDescription(data.offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('call-accepted', {
                callId: data.callId,
                answer: answer
            });
            
        } catch (error) {
            console.error('❌ Error handling offer:', error);
            this.endCall();
        }
    }

    async handleAnswer(data) {
        try {
            console.log('📥 Handling answer');
            
            if (this.peerConnection) {
                await this.peerConnection.setRemoteDescription(data.answer);
                console.log('✅ Remote description set');
            }
        } catch (error) {
            console.error('❌ Error handling answer:', error);
            this.endCall();
        }
    }

    async handleIceCandidate(data) {
        try {
            if (this.peerConnection && data.candidate) {
                await this.peerConnection.addIceCandidate(data.candidate);
                console.log('✅ ICE candidate added');
            }
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }

    startCallTimer() {
        if (this.callTimer) return;
        
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            const elapsed = Date.now() - this.callStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const timerElement = document.getElementById('call-timer');
            if (timerElement) {
                timerElement.textContent = timeStr;
            }
        }, 1000);
    }

    async endCall() {
        console.log('📞 Ending call');
        
        if (this.currentCall) {
            try {
                await fetch(`/call/${this.currentCall.callId}/end`, {
                    method: 'POST'
                });
                
                this.socket.emit('end-call', {
                    callId: this.currentCall.callId
                });
            } catch (error) {
                console.error('Error ending call:', error);
            }
        }

        this.cleanup();
    }

    cleanup() {
        // Stop timer
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        // Release media
        this.releaseMedia();
        
        // Remove remote audio
        const remoteAudio = document.getElementById('remote-audio');
        if (remoteAudio) {
            remoteAudio.remove();
        }
        
        // Hide interfaces
        this.hideCallInterfaces();
        
        // Reset state
        this.currentCall = null;
        this.callStartTime = null;
        
        console.log('✅ Call cleanup complete');
    }

    releaseMedia() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    updateCallStatus(status) {
        const statusElement = document.getElementById('call-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    showIncomingCallNotification(data) {
        this.hideCallNotification();
        
        const notification = document.createElement('div');
        notification.id = 'call-notification';
        notification.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        notification.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                <div class="text-center">
                    <div class="mb-4">
                        <img src="${data.caller.avatar || '/avatars/default.png'}" 
                             alt="${data.caller.username}" 
                             class="w-20 h-20 rounded-full mx-auto mb-2">
                        <h3 class="text-lg font-semibold">${data.caller.username}</h3>
                        <p class="text-gray-600">Incoming ${data.type} call</p>
                    </div>
                    <div class="flex space-x-4">
                        <button onclick="callManager.declineCall('${data.callId}')" 
                                class="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">
                            Decline
                        </button>
                        <button onclick="callManager.acceptCall(${JSON.stringify(data).replace(/"/g, '&quot;')})" 
                                class="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
    }

    showOutgoingCallInterface() {
        this.hideCallInterfaces();
        
        const callInterface = document.createElement('div');
        callInterface.id = 'call-interface';
        callInterface.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
        callInterface.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
                <div class="mb-4">
                    <div class="text-lg font-semibold mb-2">Calling...</div>
                    <div id="call-status" class="text-gray-600">Connecting...</div>
                    <div id="call-timer" class="text-2xl font-mono mt-4">00:00</div>
                </div>
                <button onclick="callManager.endCall()" 
                        class="bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600">
                    End Call
                </button>
            </div>
        `;
        
        document.body.appendChild(callInterface);
    }

    showInCallInterface() {
        this.hideCallInterfaces();
        
        const callInterface = document.createElement('div');
        callInterface.id = 'call-interface';
        callInterface.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50';
        callInterface.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
                <div class="mb-4">
                    <div class="text-lg font-semibold mb-2">In Call</div>
                    <div id="call-status" class="text-gray-600">Connected</div>
                    <div id="call-timer" class="text-2xl font-mono mt-4 text-green-600">00:00</div>
                </div>
                <div class="flex space-x-4 justify-center">
                    <button id="mute-btn" onclick="callManager.toggleMute()" 
                            class="bg-gray-500 text-white px-4 py-2 rounded-full hover:bg-gray-600">
                        🎤 Mute
                    </button>
                    <button onclick="callManager.endCall()" 
                            class="bg-red-500 text-white px-6 py-3 rounded-full hover:bg-red-600">
                        End Call
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(callInterface);
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                const muteBtn = document.getElementById('mute-btn');
                if (muteBtn) {
                    muteBtn.textContent = audioTrack.enabled ? '🎤 Mute' : '🔇 Unmute';
                    muteBtn.className = audioTrack.enabled 
                        ? 'bg-gray-500 text-white px-4 py-2 rounded-full hover:bg-gray-600'
                        : 'bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600';
                }
            }
        }
    }

    hideCallNotification() {
        const notification = document.getElementById('call-notification');
        if (notification) {
            notification.remove();
        }
    }

    hideCallInterfaces() {
        const callInterface = document.getElementById('call-interface');
        if (callInterface) {
            callInterface.remove();
        }
        this.hideCallNotification();
    }

    handleCallDeclined() {
        this.hideCallInterfaces();
        alert('Call was declined');
        this.cleanup();
    }

    handleCallTimeout() {
        this.hideCallInterfaces();
        alert('Call timed out');
        this.cleanup();
    }
}

// Initialize call manager
document.addEventListener('DOMContentLoaded', function() {
    if (typeof io !== 'undefined') {
        window.callManager = new CallManager();
        console.log('📞 Call manager ready');
    }
});

// Global functions for easy access
window.startAudioCall = function(receiverId) {
    if (window.callManager) {
        window.callManager.startCall(receiverId, 'audio');
    }
};

window.startVideoCall = function(receiverId) {
    if (window.callManager) {
        window.callManager.startCall(receiverId, 'video');
    }
};
