
// WebRTC Debugging Utilities
class WebRTCDebugger {
    static logMediaDevices() {
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                console.log('Available media devices:');
                devices.forEach(device => {
                    console.log(`  ${device.kind}: ${device.label} (${device.deviceId})`);
                });
            })
            .catch(err => console.error('Error enumerating devices:', err));
    }

    static checkBrowserSupport() {
        const support = {
            getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            RTCPeerConnection: !!window.RTCPeerConnection,
            WebSocket: !!window.WebSocket,
            socketIO: !!window.io
        };
        
        console.log('Browser WebRTC support:', support);
        return support;
    }

    static logPeerConnectionStats(pc) {
        if (!pc) return;
        
        pc.getStats().then(stats => {
            console.log('Peer Connection Stats:');
            stats.forEach(report => {
                if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                    console.log('Active candidate pair:', report);
                }
                if (report.type === 'inbound-rtp' && report.mediaType) {
                    console.log(`Inbound ${report.mediaType}:`, {
                        packetsReceived: report.packetsReceived,
                        bytesReceived: report.bytesReceived,
                        packetsLost: report.packetsLost
                    });
                }
            });
        }).catch(err => console.error('Error getting stats:', err));
    }

    static testSTUNConnectivity() {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('STUN server test - ICE candidate:', event.candidate.candidate);
                if (event.candidate.candidate.includes('srflx')) {
                    console.log('✅ STUN server is working - got server reflexive candidate');
                }
            }
        };

        // Create a dummy data channel to trigger ICE gathering
        pc.createDataChannel('test');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        setTimeout(() => {
            pc.close();
            console.log('STUN connectivity test completed');
        }, 5000);
    }
}

// Auto-run basic checks when loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Running WebRTC diagnostics...');
    WebRTCDebugger.checkBrowserSupport();
    WebRTCDebugger.logMediaDevices();
    WebRTCDebugger.testSTUNConnectivity();
});

// Make available globally
window.WebRTCDebugger = WebRTCDebugger;
