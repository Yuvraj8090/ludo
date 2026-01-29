import React, { useEffect, useState, useRef } from 'react';
import './VideoChat.css';

const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
};

const VideoChat = ({ socket, roomId, userId, onClose }) => {
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]); // Array of { peerId, stream }
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const localVideoRef = useRef(null);
  const peerConnections = useRef({}); // Store RTCPeerConnection objects keyed by peerId

  // 1. Initialize Local Stream
  useEffect(() => {
    const startStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Notify server we are ready to join video chat
        socket.emit('join-video', { roomId, userId });
      } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Could not access camera/microphone. Please allow permissions.');
      }
    };

    startStream();

    return () => {
      // Cleanup: Stop all tracks and close connections
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      socket.emit('leave-video', { roomId, userId });
    };
  }, []);

  // 2. Handle Socket Events for WebRTC Signaling
  useEffect(() => {
    if (!socket || !localStream) return;

    // Handle when a new user joins: Create an Offer
    socket.on('user-connected-video', async ({ userId: remoteUserId }) => {
      console.log('New user connected to video:', remoteUserId);
      createPeerConnection(remoteUserId, localStream, true); // true = initiator
    });

    // Handle receiving an Offer
    socket.on('offer', async ({ offer, from }) => {
      console.log('Received offer from:', from);
      const pc = createPeerConnection(from, localStream, false);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { answer, to: from });
    });

    // Handle receiving an Answer
    socket.on('answer', async ({ answer, from }) => {
      console.log('Received answer from:', from);
      const pc = peerConnections.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Handle receiving ICE Candidates
    socket.on('ice-candidate', async ({ candidate, from }) => {
      const pc = peerConnections.current[from];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding received ice candidate', e);
        }
      }
    });

    // Handle user disconnect
    socket.on('user-disconnected-video', ({ userId: remoteUserId }) => {
      console.log('User disconnected video:', remoteUserId);
      if (peerConnections.current[remoteUserId]) {
        peerConnections.current[remoteUserId].close();
        delete peerConnections.current[remoteUserId];
        setPeers((prev) => prev.filter((p) => p.peerId !== remoteUserId));
      }
    });

    return () => {
      socket.off('user-connected-video');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-disconnected-video');
    };
  }, [socket, localStream]);

  // 3. Helper: Create RTCPeerConnection
  const createPeerConnection = (remotePeerId, stream, isInitiator) => {
    if (peerConnections.current[remotePeerId]) {
        return peerConnections.current[remotePeerId]; // Already exists
    }

    const pc = new RTCPeerConnection(iceServers);
    peerConnections.current[remotePeerId] = pc;

    // Add local tracks to the connection
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: remotePeerId,
        });
      }
    };

    // Handle remote stream added
    pc.ontrack = (event) => {
      setPeers((prev) => {
        // Avoid duplicates
        if (prev.some((p) => p.peerId === remotePeerId)) return prev;
        return [...prev, { peerId: remotePeerId, stream: event.streams[0] }];
      });
    };

    // If we are the initiator, create the offer
    if (isInitiator) {
      const createOffer = async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer, to: remotePeerId });
      };
      createOffer();
    }

    return pc;
  };

  // 4. Toggle Controls
  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
      setIsMuted(!localStream.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
      setIsVideoOff(!localStream.getVideoTracks()[0].enabled);
    }
  };

  return (
    <div className="video-chat-container">
      <div className="video-header">
        <h4>Video Chat</h4>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="video-grid">
        {/* Local Video */}
        <div className="video-wrapper local">
          <video
            ref={localVideoRef}
            autoPlay
            muted // Mute local video to prevent feedback
            playsInline
            className={isVideoOff ? 'hidden' : ''}
          />
          <span className="user-label">You {isMuted && '🚫'}</span>
          {isVideoOff && <div className="video-placeholder">📷 Off</div>}
        </div>

        {/* Remote Videos */}
        {peers.map((peer) => (
          <VideoPlayer key={peer.peerId} stream={peer.stream} label={`Player ${peer.peerId.substr(0,4)}`} />
        ))}
      </div>

      <div className="video-controls">
        <button onClick={toggleVideo} className={isVideoOff ? 'off' : ''}>
          {isVideoOff ? '📷 Enable' : '📷 Stop'}
        </button>
        <button onClick={toggleMic} className={isMuted ? 'off' : ''}>
          {isMuted ? '🎤 Unmute' : '🎤 Mute'}
        </button>
      </div>
    </div>
  );
};

// Sub-component for remote videos to handle refs cleanly
const VideoPlayer = ({ stream, label }) => {
  const ref = useRef();

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="video-wrapper">
      <video ref={ref} autoPlay playsInline />
      <span className="user-label">{label}</span>
    </div>
  );
};

export default VideoChat;