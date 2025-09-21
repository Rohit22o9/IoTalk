
// WebRTC Debugging Utilities
window.WebRTCDebugger = {
  logPeerConnectionStats: function(peerConnection) {
    if (!peerConnection) {
      console.log('🔍 No peer connection to debug');
      return;
    }
    
    console.log('🔍 WebRTC Debug - Connection State:', peerConnection.connectionState);
    console.log('🔍 WebRTC Debug - ICE Connection State:', peerConnection.iceConnectionState);
    console.log('🔍 WebRTC Debug - ICE Gathering State:', peerConnection.iceGatheringState);
    console.log('🔍 WebRTC Debug - Signaling State:', peerConnection.signalingState);
    
    // Log senders (outgoing tracks)
    const senders = peerConnection.getSenders();
    console.log('🔍 WebRTC Debug - Senders:', senders.length);
    senders.forEach((sender, index) => {
      if (sender.track) {
        console.log(`📤 Sender ${index}:`, {
          kind: sender.track.kind,
          enabled: sender.track.enabled,
          muted: sender.track.muted,
          readyState: sender.track.readyState
        });
      }
    });
    
    // Log receivers (incoming tracks)
    const receivers = peerConnection.getReceivers();
    console.log('🔍 WebRTC Debug - Receivers:', receivers.length);
    receivers.forEach((receiver, index) => {
      if (receiver.track) {
        console.log(`📥 Receiver ${index}:`, {
          kind: receiver.track.kind,
          enabled: receiver.track.enabled,
          muted: receiver.track.muted,
          readyState: receiver.track.readyState
        });
      }
    });
    
    // Get detailed stats
    if (peerConnection.getStats) {
      peerConnection.getStats().then(stats => {
        stats.forEach(report => {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            console.log('🔍 WebRTC Debug - Inbound Audio RTP:', {
              bytesReceived: report.bytesReceived,
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              jitter: report.jitter
            });
          } else if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            console.log('🔍 WebRTC Debug - Outbound Audio RTP:', {
              bytesSent: report.bytesSent,
              packetsSent: report.packetsSent
            });
          }
        });
      }).catch(err => {
        console.error('🔍 WebRTC Debug - Error getting stats:', err);
      });
    }
  },
  
  testAudioContext: function() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🔍 Audio Context Test - State:', audioContext.state);
      console.log('🔍 Audio Context Test - Sample Rate:', audioContext.sampleRate);
      audioContext.close();
      return true;
    } catch (error) {
      console.error('🔍 Audio Context Test - Error:', error);
      return false;
    }
  }
};

console.log('🔍 WebRTC Debugger loaded successfully');
