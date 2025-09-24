
// Clean WebRTC Calling System
class CallManager {
    constructor() {
        // Use existing socket or create new one
        this.socket = window.socket;
        if (!this.socket) {
            this.socket = io();
            window.socket = this.socket;
        }
        
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.pendingCall = null;
        this.callTimer = null;
        this.callStartTime = null;
        
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' }
            ]
        };
        
        this.initializeEventListeners();
        console.log('📞 CallManager initialized with socket:', !!this.socket);
    }

    initializeEventListeners() {
        // Incoming call events
        this.socket.on('incoming-call', (data) => {
            console.log('📞 Incoming call from:', data.caller.username);
            
            // Store the call data for later use
            this.pendingCall = {
                callId: data.callId,
                caller: data.caller,
                type: data.type
            };
            
            this.showIncomingCallNotification(data);
        });

        this.socket.on('call-accepted', (data) => {
            console.log('📞 Call accepted:', data);
            if (data.answer) {
                console.log('📞 Call accepted with answer, handling WebRTC');
                this.handleCallAcceptedWithAnswer(data);
            } else {
                console.log('📞 Call accepted, creating offer for WebRTC');
                this.handleCallAccepted(data);
            }
        });

        this.socket.on('call-offer', async (data) => {
            console.log('📥 Received call offer');
            await this.handleOffer(data);
        });

        this.socket.on('call-answer', async (data) => {
            console.log('📥 Received call answer');
            await this.handleAnswer(data);
        });

        this.socket.on('call-rejected', (data) => {
            console.log('📞 Call rejected');
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

    async acceptIncomingCall() {
        try {
            if (!this.pendingCall) {
                console.error('❌ No pending call to accept');
                return;
            }

            console.log('📞 Accepting incoming call:', this.pendingCall.callId);
            
            // Get user media
            await this.getUserMedia(this.pendingCall.type);
            
            this.currentCall = {
                callId: this.pendingCall.callId,
                callerId: this.pendingCall.caller.id,
                type: this.pendingCall.type,
                isInitiator: false
            };

            // Accept call on server first
            const response = await fetch(`/call/${this.pendingCall.callId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept' })
            });

            if (response.ok) {
                this.hideCallNotification();
                this.showInCallInterface();
                console.log('📞 Call accepted on server');
                
                // Handle the WebRTC offer from the pending call
                await this.handleIncomingOffer(this.pendingCall);
                
            } else {
                throw new Error('Failed to accept call');
            }
        } catch (error) {
            console.error('❌ Error accepting call:', error);
            this.releaseMedia();
            alert('Failed to accept call');
        }
    }

    async rejectIncomingCall() {
        try {
            if (!this.pendingCall) {
                console.error('❌ No pending call to reject');
                return;
            }

            console.log('📞 Rejecting incoming call:', this.pendingCall.callId);
            
            // Decline on server
            await fetch(`/call/${this.pendingCall.callId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline' })
            });
            
            // Also emit socket event for real-time notification
            this.socket.emit('reject-call', { callId: this.pendingCall.callId });
            
            this.hideCallNotification();
            this.pendingCall = null;
            console.log('📞 Call rejected');
        } catch (error) {
            console.error('❌ Error rejecting call:', error);
        }
    }

    async handleIncomingOffer(callData) {
        try {
            console.log('📥 Handling incoming offer from pending call');
            
            if (!this.peerConnection) {
                this.createPeerConnection();
            }
            
            await this.peerConnection.setRemoteDescription(callData.offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            // Send answer back to caller
            this.socket.emit('accept-call', {
                callId: callData.callId,
                answer: answer
            });
            
            console.log('📤 Answer sent to caller');
            this.pendingCall = null;
            
        } catch (error) {
            console.error('❌ Error handling incoming offer:', error);
            this.endCall();
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
                console.log('➕ Adding local track:', track.kind);
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('📥 Received remote track:', event.track.kind);
            this.remoteStream = event.streams[0];
            this.setupRemoteAudio(this.remoteStream);
            this.updateCallStatus('Connected');
            this.startCallTimer();
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate:', event.candidate.type);
                this.socket.emit('ice-candidate', {
                    callId: this.currentCall.callId,
                    candidate: event.candidate
                });
            } else {
                console.log('🧊 ICE gathering complete');
            }
        };

        // Connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('🔗 Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                this.updateCallStatus('Connected');
                if (!this.callTimer) {
                    this.startCallTimer();
                }
            } else if (this.peerConnection.connectionState === 'failed') {
                console.error('❌ Connection failed');
                this.endCall();
            }
        };

        // ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
            if (this.peerConnection.iceConnectionState === 'connected') {
                this.updateCallStatus('Connected');
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
            console.log('📞 Call accepted, creating offer for WebRTC');
            
            this.showInCallInterface();
            
            // Create peer connection if not already created
            if (!this.peerConnection) {
                this.createPeerConnection();
            }
            
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: this.currentCall.type === 'video'
            });
            await this.peerConnection.setLocalDescription(offer);
            
            console.log('📤 Sending WebRTC offer to receiver');
            this.socket.emit('call-user', {
                callId: this.currentCall.callId,
                offer: offer
            });
            
        } catch (error) {
            console.error('❌ Error handling call acceptance:', error);
            this.endCall();
        }
    }

    async handleCallAcceptedWithAnswer(data) {
        try {
            console.log('📥 Handling answer from receiver');
            
            if (this.peerConnection && data.answer) {
                await this.peerConnection.setRemoteDescription(data.answer);
                console.log('✅ Remote description set from answer');
            }
        } catch (error) {
            console.error('❌ Error handling answer:', error);
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
        console.log('📞 Showing incoming call notification for:', data.caller.username);
        
        // Hide any existing notifications first
        this.hideCallNotification();
        
        const notification = document.createElement('div');
        notification.id = 'call-notification';
        notification.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]';
        notification.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            z-index: 9999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: rgba(0, 0, 0, 0.75) !important;
        `;
        
        notification.innerHTML = `
            <div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" style="animation: pulse 2s infinite;">
                <div class="text-center">
                    <div class="mb-6">
                        <div class="relative inline-block">
                            <img src="${data.caller.avatar || '/avatars/default.png'}" 
                                 alt="${data.caller.username}" 
                                 class="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-green-200"
                                 style="width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 12px auto; border: 4px solid #bbf7d0;">
                            <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white" 
                                 style="position: absolute; bottom: -4px; right: -4px; width: 24px; height: 24px; background-color: #10b981; border-radius: 50%; border: 2px solid white; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        </div>
                        <h3 class="text-xl font-bold text-gray-900" style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 4px;">${data.caller.username}</h3>
                        <p class="text-gray-600 text-sm mt-1" style="color: #4b5563; font-size: 0.875rem;">📞 Incoming ${data.type} call</p>
                    </div>
                    <div class="flex space-x-4" style="display: flex; gap: 16px;">
                        <button id="decline-call-btn" 
                                class="flex-1 bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors font-semibold shadow-lg"
                                style="flex: 1; background-color: #ef4444; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 600; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: none; cursor: pointer; transition: background-color 0.2s;">
                            <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20" style="width: 20px; height: 20px; display: inline; margin-right: 8px;">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                            </svg>
                            Decline
                        </button>
                        <button id="accept-call-btn" 
                                class="flex-1 bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors font-semibold shadow-lg"
                                style="flex: 1; background-color: #10b981; color: white; padding: 12px 24px; border-radius: 12px; font-weight: 600; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: none; cursor: pointer; transition: background-color 0.2s;">
                            <svg class="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20" style="width: 20px; height: 20px; display: inline; margin-right: 8px;">
                                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
                            </svg>
                            Accept
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add event listeners to buttons
        const declineBtn = notification.querySelector('#decline-call-btn');
        const acceptBtn = notification.querySelector('#accept-call-btn');
        
        if (declineBtn) {
            declineBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📞 Decline button clicked');
                this.rejectIncomingCall();
            });
            
            declineBtn.addEventListener('mouseover', () => {
                declineBtn.style.backgroundColor = '#dc2626';
            });
            
            declineBtn.addEventListener('mouseout', () => {
                declineBtn.style.backgroundColor = '#ef4444';
            });
        }
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📞 Accept button clicked');
                this.acceptIncomingCall();
            });
            
            acceptBtn.addEventListener('mouseover', () => {
                acceptBtn.style.backgroundColor = '#059669';
            });
            
            acceptBtn.addEventListener('mouseout', () => {
                acceptBtn.style.backgroundColor = '#10b981';
            });
        }
        
        // Auto-dismiss after 30 seconds
        const timeoutId = setTimeout(() => {
            if (document.getElementById('call-notification')) {
                console.log('📞 Auto-declining call after timeout');
                this.rejectIncomingCall();
            }
        }, 30000);
        
        // Store timeout ID to clear it if needed
        notification.setAttribute('data-timeout-id', timeoutId);
        
        console.log('✅ Incoming call notification displayed successfully');
        
        // Play notification sound
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LKeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMZCTuB0fDahDEELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LKeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMZCTuB0fDahDEELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LKeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMZCTuB0fDahDEELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LKeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMZCTuB0fDahDEELIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LKeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMZCQ==');
            audio.volume = 0.3;
            audio.play().catch(() => console.log('Could not play notification sound'));
        } catch (e) {
            console.log('Notification sound not available');
        }
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
            // Clear any pending timeout
            const timeoutId = notification.getAttribute('data-timeout-id');
            if (timeoutId) {
                clearTimeout(parseInt(timeoutId));
            }
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

// Global functions for easy access
window.startAudioCall = function(receiverId) {
    console.log('📞 Global startAudioCall called for:', receiverId);
    if (window.callManager) {
        window.callManager.startCall(receiverId, 'audio');
    } else {
        console.error('❌ CallManager not available');
        alert('Call system not ready. Please refresh the page.');
    }
};

window.startVideoCall = function(receiverId) {
    console.log('📞 Global startVideoCall called for:', receiverId);
    if (window.callManager) {
        window.callManager.startCall(receiverId, 'video');
    } else {
        console.error('❌ CallManager not available');
        alert('Call system not ready. Please refresh the page.');
    }
};

// Auto-initialize if not done already
if (typeof window !== 'undefined' && !window.callManager && typeof io !== 'undefined') {
    console.log('📞 Auto-initializing CallManager');
    window.callManager = new CallManager();
}
