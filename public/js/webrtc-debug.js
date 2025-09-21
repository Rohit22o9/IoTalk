
// WebRTC Debugging Utilities for ModernChat
class WebRTCDebugger {
    static logMediaDevices() {
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                console.log('🎤 Available media devices:');
                devices.forEach(device => {
                    console.log(`  ${device.kind}: ${device.label || 'Unknown'} (${device.deviceId})`);
                });
            })
            .catch(err => console.error('❌ Error enumerating devices:', err));
    }

    static checkBrowserSupport() {
        const support = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            RTCPeerConnection: !!window.RTCPeerConnection,
            WebSocket: !!window.WebSocket,
            socketIO: !!window.io
        };
        
        console.log('🌐 Browser WebRTC support:', support);
        
        if (!support.getUserMedia) {
            console.error('❌ getUserMedia not supported');
        }
        if (!support.RTCPeerConnection) {
            console.error('❌ RTCPeerConnection not supported');
        }
        
        return support;
    }

    static logPeerConnectionStats(pc) {
        if (!pc) return;
        
        pc.getStats().then(stats => {
            console.log('📊 Peer Connection Stats:');
            stats.forEach(report => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    console.log('🔗 Active candidate pair:', report);
                }
                if (report.type === 'inbound-rtp' && report.mediaType) {
                    console.log(`📥 Inbound ${report.mediaType}:`, {
                        packetsReceived: report.packetsReceived,
                        bytesReceived: report.bytesReceived,
                        packetsLost: report.packetsLost
                    });
                }
                if (report.type === 'outbound-rtp' && report.mediaType) {
                    console.log(`📤 Outbound ${report.mediaType}:`, {
                        packetsSent: report.packetsSent,
                        bytesSent: report.bytesSent
                    });
                }
            });
        }).catch(err => console.error('❌ Error getting stats:', err));
    }

    static testSTUNConnectivity() {
        console.log('🧪 Testing STUN connectivity...');
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 STUN test - ICE candidate:', event.candidate.candidate);
                if (event.candidate.candidate.includes('srflx')) {
                    console.log('✅ STUN server working - got server reflexive candidate');
                }
            } else {
                console.log('🧊 STUN test - ICE gathering completed');
            }
        };

        pc.onicegatheringstatechange = () => {
            console.log('🧊 STUN test - ICE gathering state:', pc.iceGatheringState);
        };

        // Create a dummy data channel to trigger ICE gathering
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        setTimeout(() => {
            pc.close();
            console.log('🧪 STUN connectivity test completed');
        }, 5000);
    }

    static async testMediaAccess() {
        console.log('🎤 Testing media access...');
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            console.log('✅ Media access granted');
            console.log('🎤 Audio tracks:', stream.getAudioTracks().length);
            
            stream.getTracks().forEach(track => {
                console.log(`  ${track.kind}: ${track.label} (enabled: ${track.enabled})`);
                track.stop();
            });
            
            return true;
        } catch (error) {
            console.error('❌ Media access failed:', error.name, error.message);
            return false;
        }
    }

    static async testTURNConnectivity() {
        console.log('🔄 Testing TURN connectivity...');
        
        const pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🔄 TURN test - ICE candidate:', event.candidate.candidate);
                if (event.candidate.candidate.includes('relay')) {
                    console.log('✅ TURN server working - got relay candidate');
                }
            }
        };

        // Create data channel and offer
        pc.createDataChannel('turn-test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        setTimeout(() => {
            pc.close();
            console.log('🔄 TURN connectivity test completed');
        }, 10000);
    }

    static monitorCallQuality(pc) {
        if (!pc) return;
        
        const interval = setInterval(() => {
            if (pc.connectionState === 'closed') {
                clearInterval(interval);
                return;
            }
            
            pc.getStats().then(stats => {
                stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
                        const packetsLost = report.packetsLost || 0;
                        const packetsReceived = report.packetsReceived || 0;
                        const total = packetsLost + packetsReceived;
                        const lossRate = total > 0 ? (packetsLost / total * 100) : 0;
                        
                        if (lossRate > 5) {
                            console.warn(`⚠️ High audio packet loss: ${lossRate.toFixed(2)}%`);
                        }
                    }
                });
            });
        }, 5000);
    }
}

// Auto-run basic checks when loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Running WebRTC diagnostics...');
    WebRTCDebugger.checkBrowserSupport();
    WebRTCDebugger.logMediaDevices();
    WebRTCDebugger.testSTUNConnectivity();
    WebRTCDebugger.testTURNConnectivity();
    WebRTCDebugger.testMediaAccess();
});

// Make available globally
window.WebRTCDebugger = WebRTCDebugger;
