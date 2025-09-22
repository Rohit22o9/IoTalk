
// WebRTC Call Manager - Fixed Audio Implementation
class CallManager {
    constructor() {
        this.socket = window.socket || io();
        if (!window.socket) {
            window.socket = this.socket;
        }
        
        this.localStream = null;
        this.peerConnection = null;
        this.currentCall = null;
        this.isInCall = false;
        this.callTimer = null;
        this.callStartTime = null;
        
        // Enhanced WebRTC configuration with reliable STUN/TURN servers
        this.pcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        };
        
        this.initializeEventListeners();
        console.log('📞 CallManager initialized with enhanced audio support');
    }

    initializeEventListeners() {
        // Incoming call events
        this.socket.on('incoming-call', (data) => {
            console.log('📞 Incoming call from:', data.caller.username);
            this.showIncomingCallNotification(data);
        });

        this.socket.on('call-accepted', (data) => {
            console.log('📞 Call accepted by:', data.receiver?.username || data.caller?.username);
            this.handleCallAccepted(data);
        });

        this.socket.on('call-declined', (data) => {
            console.log('📞 Call declined by:', data.receiver.username);
            this.handleCallDeclined();
        });

        this.socket.on('call-cancelled', (data) => {
            console.log('📞 Call cancelled');
            this.handleCallCancelled();
        });

        this.socket.on('call-ended', (data) => {
            console.log('📞 Call ended');
            this.endCall();
        });

        this.socket.on('call-timeout', (data) => {
            console.log('📞 Call timeout');
            this.handleCallTimeout();
        });

        this.socket.on('call-missed', (data) => {
            console.log('📞 Missed call from:', data.caller.username);
            this.showMissedCallNotification(data);
        });

        // WebRTC signaling events
        this.socket.on('call-offer', async (data) => {
            console.log('📤 Received call offer for call:', data.callId);
            await this.handleOffer(data);
        });

        this.socket.on('call-answer', async (data) => {
            console.log('📤 Received call answer for call:', data.callId);
            await this.handleAnswer(data);
        });

        this.socket.on('ice-candidate', async (data) => {
            console.log('🧊 Received ICE candidate for call:', data.callId);
            await this.handleIceCandidate(data);
        });
    }

    async initiateCall(receiverId, type = 'audio') {
        try {
            console.log('📞 Initiating call to:', receiverId, 'Type:', type);
            
            // First get user media before making the call
            await this.getUserMedia(type);
            
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
                console.log('📞 Call initiated successfully:', result.callId);
            } else {
                console.error('❌ Failed to initiate call:', result.error);
                this.releaseMedia();
                alert(result.error);
            }
        } catch (error) {
            console.error('❌ Error initiating call:', error);
            this.releaseMedia();
            alert('Failed to start call');
        }
    }

    async getUserMedia(type = 'audio') {
        try {
            console.log('🎤 Requesting user media, type:', type);
            
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100,
                    channelCount: 2
                },
                video: type === 'video' ? {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30 }
                } : false
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            console.log('✅ User media obtained successfully');
            console.log('🎤 Audio tracks:', this.localStream.getAudioTracks().length);
            console.log('📹 Video tracks:', this.localStream.getVideoTracks().length);
            
            // Log track details and ensure they're enabled
            this.localStream.getTracks().forEach(track => {
                track.enabled = true;
                console.log(`  ${track.kind}: ${track.label} (enabled: ${track.enabled})`);
            });
            
            // Test audio levels
            if (this.localStream.getAudioTracks().length > 0) {
                this.testAudioLevels();
            }
            
            return this.localStream;
        } catch (error) {
            console.error('❌ Error getting user media:', error);
            if (error.name === 'NotAllowedError') {
                alert('Please allow microphone access to make calls');
            } else if (error.name === 'NotFoundError') {
                alert('No microphone found. Please connect a microphone');
            }
            throw error;
        }
    }

    testAudioLevels() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(this.localStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            const checkLevel = () => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                console.log('🎤 Audio level:', Math.round(average));
                
                if (average > 10) {
                    console.log('✅ Audio input detected');
                    audioContext.close();
                } else {
                    setTimeout(checkLevel, 100);
                }
            };
            
            checkLevel();
        } catch (error) {
            console.error('Audio level test failed:', error);
        }
    }

    createPeerConnection() {
        console.log('🔗 Creating peer connection with config:', this.pcConfig);
        
        this.peerConnection = new RTCPeerConnection(this.pcConfig);

        // Add local tracks to peer connection
        if (this.localStream) {
            console.log('📤 Adding local tracks to peer connection');
            this.localStream.getTracks().forEach(track => {
                console.log(`📤 Adding ${track.kind} track:`, track.label);
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        this.peerConnection.ontrack = (event) => {
            console.log('📥 Received remote track:', event.track.kind);
            console.log('📥 Remote streams:', event.streams.length);
            
            if (event.streams.length > 0) {
                const remoteStream = event.streams[0];
                console.log('📥 Remote stream tracks:', remoteStream.getTracks().length);
                
                // Remove any existing remote audio elements
                document.querySelectorAll('audio[id^="remoteAudio_"]').forEach(el => el.remove());
                
                // Create audio element for remote audio
                const audioElement = document.createElement('audio');
                audioElement.srcObject = remoteStream;
                audioElement.autoplay = true;
                audioElement.playsInline = true;
                audioElement.controls = false;
                audioElement.style.display = 'none';
                audioElement.id = 'remoteAudio_' + Date.now();
                audioElement.volume = 1.0;
                
                // Add event listeners for debugging
                audioElement.onloadedmetadata = () => {
                    console.log('✅ Remote audio metadata loaded');
                    this.updateCallStatus('Connected');
                    this.startCallTimer();
                };
                
                audioElement.onplay = () => {
                    console.log('▶️ Remote audio started playing');
                };
                
                audioElement.onerror = (e) => {
                    console.error('❌ Remote audio error:', e);
                };
                
                audioElement.oncanplay = () => {
                    console.log('📻 Remote audio can play');
                };
                
                document.body.appendChild(audioElement);
                console.log('✅ Remote audio element created and added to DOM');
                
                // Ensure audio plays with user interaction check
                const playAudio = () => {
                    audioElement.play().then(() => {
                        console.log('✅ Remote audio play() succeeded');
                    }).catch(err => {
                        console.error('❌ Remote audio play() failed:', err);
                        // Try to play again after user interaction
                        document.addEventListener('click', () => {
                            audioElement.play();
                        }, { once: true });
                    });
                };
                
                // Play immediately or after user interaction
                if (document.hasFocus()) {
                    playAudio();
                } else {
                    document.addEventListener('click', playAudio, { once: true });
                }
            }
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate:', event.candidate.candidate);
                this.socket.emit('ice-candidate', {
                    callId: this.currentCall.callId,
                    candidate: event.candidate
                });
            } else {
                console.log('🧊 ICE gathering completed');
            }
        };

        // Connection state changes
        this.peerConnection.onconnectionstatechange = () => {
            console.log('🔗 Connection state:', this.peerConnection.connectionState);
            
            if (this.peerConnection.connectionState === 'connected') {
                console.log('✅ Peer connection established successfully');
                this.updateCallStatus('Connected');
                if (!this.callTimer) {
                    this.startCallTimer();
                }
            } else if (this.peerConnection.connectionState === 'failed') {
                console.error('❌ Peer connection failed');
                this.updateCallStatus('Connection failed');
                setTimeout(() => this.endCall(), 2000);
            } else if (this.peerConnection.connectionState === 'disconnected') {
                console.log('🔌 Peer connection disconnected');
                this.updateCallStatus('Reconnecting...');
            }
        };

        // ICE connection state changes
        this.peerConnection.oniceconnectionstatechange = () => {
            console.log('🧊 ICE connection state:', this.peerConnection.iceConnectionState);
        };

        return this.peerConnection;
    }

    async handleCallAccepted(data) {
        try {
            console.log('📞 Handling call acceptance');
            
            if (!this.currentCall) {
                console.error('❌ No current call to accept');
                return;
            }

            // Update UI to show connected state
            this.updateCallStatus('Connecting...');
            this.showInCallInterface();
            
            // Create peer connection and send offer
            this.createPeerConnection();
            
            console.log('📤 Creating offer');
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: this.currentCall.type === 'video'
            });
            
            await this.peerConnection.setLocalDescription(offer);
            console.log('📤 Local description set, sending offer');
            
            this.socket.emit('call-offer', {
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
            console.log('📥 Handling incoming offer');
            
            if (!this.currentCall || this.currentCall.callId !== data.callId) {
                console.error('❌ No matching call for offer');
                return;
            }

            this.createPeerConnection();
            
            await this.peerConnection.setRemoteDescription(data.offer);
            console.log('📥 Remote description set from offer');
            
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            console.log('📤 Sending answer');
            this.socket.emit('call-answer', {
                callId: this.currentCall.callId,
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
            
            if (!this.peerConnection) {
                console.error('❌ No peer connection for answer');
                return;
            }

            await this.peerConnection.setRemoteDescription(data.answer);
            console.log('✅ Remote description set from answer');
            
        } catch (error) {
            console.error('❌ Error handling answer:', error);
            this.endCall();
        }
    }

    async handleIceCandidate(data) {
        try {
            if (!this.peerConnection) {
                console.error('❌ No peer connection for ICE candidate');
                return;
            }

            await this.peerConnection.addIceCandidate(data.candidate);
            console.log('✅ ICE candidate added successfully');
            
        } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
        }
    }

    async acceptCall(callData) {
        try {
            console.log('📞 Accepting call:', callData.callId);
            
            // Get user media first
            await this.getUserMedia(callData.type);
            
            this.currentCall = {
                callId: callData.callId,
                callerId: callData.caller.id,
                type: callData.type,
                isInitiator: false
            };

            const response = await fetch(`/call/${callData.callId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'accept' })
            });

            const result = await response.json();
            if (result.success) {
                this.hideCallNotification();
                this.showInCallInterface();
                console.log('📞 Call accepted successfully');
            } else {
                console.error('❌ Failed to accept call:', result.error);
                this.releaseMedia();
            }
        } catch (error) {
            console.error('❌ Error accepting call:', error);
            this.releaseMedia();
        }
    }

    async declineCall(callId) {
        try {
            const response = await fetch(`/call/${callId}/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'decline' })
            });

            if (response.ok) {
                this.hideCallNotification();
                console.log('📞 Call declined');
            }
        } catch (error) {
            console.error('❌ Error declining call:', error);
        }
    }

    async endCall() {
        try {
            console.log('📞 Ending call');
            
            if (this.currentCall) {
                await fetch(`/call/${this.currentCall.callId}/end`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            this.cleanup();
        } catch (error) {
            console.error('❌ Error ending call:', error);
            this.cleanup();
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up call resources');
        
        // Stop call timer
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
        
        // Remove remote audio elements
        document.querySelectorAll('audio[id^="remoteAudio_"]').forEach(el => el.remove());
        
        // Hide call interfaces
        this.hideCallInterfaces();
        
        // Reset state
        this.currentCall = null;
        this.isInCall = false;
        this.callStartTime = null;
        
        console.log('✅ Call cleanup completed');
    }

    releaseMedia() {
        if (this.localStream) {
            console.log('🛑 Releasing local media stream');
            this.localStream.getTracks().forEach(track => {
                track.stop();
                console.log(`🛑 Stopped ${track.kind} track`);
            });
            this.localStream = null;
        }
    }

    startCallTimer() {
        if (this.callTimer) {
            console.log('📱 Call timer already running');
            return;
        }
        
        console.log('📱 Starting call timer');
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            const elapsed = Date.now() - this.callStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            const timerElement = document.getElementById('call-timer');
            if (timerElement) {
                timerElement.textContent = timeStr;
                console.log('⏱️ Call duration:', timeStr);
            }
        }, 1000);
    }

    updateCallStatus(status) {
        const statusElement = document.getElementById('call-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
        console.log('📞 Call status updated:', status);
    }

    showIncomingCallNotification(data) {
        this.hideCallNotification(); // Remove any existing notification
        
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
                    <div id="call-status" class="text-gray-600">Calling...</div>
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
                    <div id="call-status" class="text-gray-600">Connecting...</div>
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
                console.log('🎤 Microphone', audioTrack.enabled ? 'unmuted' : 'muted');
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

    handleCallCancelled() {
        this.hideCallInterfaces();
        this.cleanup();
    }

    handleCallTimeout() {
        this.hideCallInterfaces();
        alert('Call timed out');
        this.cleanup();
    }

    showMissedCallNotification(data) {
        if (window.ModernChat && window.ModernChat.showNotification) {
            window.ModernChat.showNotification(
                `Missed call from ${data.caller.username}`,
                'info',
                5000
            );
        }
    }
}

// Initialize call manager when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (typeof io !== 'undefined') {
        window.callManager = new CallManager();
        console.log('📞 Call manager initialized and available globally');
    } else {
        console.error('❌ Socket.IO not loaded for calls');
    }
});

console.log('📞 Call.js loaded with enhanced audio support');
