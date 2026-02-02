// VideoChat.jsx - WebRTC Video/Voice Chat Component with Tailwind
import React, { useEffect, useRef, useState } from 'react';

const VideoChat = ({ socket, gameId, userId, players }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const remoteVideoRefs = useRef({});

  // ICE servers configuration
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // Initialize local media stream
  useEffect(() => {
    if (isChatOpen) {
      startLocalStream();
    } else {
      stopLocalStream();
    }

    return () => {
      stopLocalStream();
    };
  }, [isChatOpen]);

  // Setup WebRTC signaling
  useEffect(() => {
    if (!socket || !isChatOpen) return;

    socket.on('webrtc-offer', async ({ from, offer }) => {
      await handleOffer(from, offer);
    });

    socket.on('webrtc-answer', async ({ from, answer }) => {
      await handleAnswer(from, answer);
    });

    socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      await handleIceCandidate(from, candidate);
    });

    socket.on('peer-disconnected', ({ userId: disconnectedUserId }) => {
      closePeerConnection(disconnectedUserId);
    });

    return () => {
      socket.off('webrtc-offer');
      socket.off('webrtc-answer');
      socket.off('webrtc-ice-candidate');
      socket.off('peer-disconnected');
    };
  }, [socket, isChatOpen, localStream]);

  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });

      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      socket.emit('video-chat-ready', { gameId, userId });

      players.forEach(player => {
        if (player.userId !== userId) {
          createPeerConnection(player.userId, true);
        }
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please check permissions.');
    }
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    Object.keys(peerConnections.current).forEach(peerId => {
      closePeerConnection(peerId);
    });
  };

  const createPeerConnection = async (peerId, isInitiator) => {
    try {
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnections.current[peerId] = peerConnection;

      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }

      peerConnection.ontrack = (event) => {
        setRemoteStreams(prev => ({
          ...prev,
          [peerId]: event.streams[0]
        }));

        if (remoteVideoRefs.current[peerId]) {
          remoteVideoRefs.current[peerId].srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc-ice-candidate', {
            gameId,
            to: peerId,
            from: userId,
            candidate: event.candidate
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed') {
          closePeerConnection(peerId);
        }
      };

      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        socket.emit('webrtc-offer', {
          gameId,
          to: peerId,
          from: userId,
          offer: offer
        });
      }

      return peerConnection;
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  const handleOffer = async (peerId, offer) => {
    try {
      let peerConnection = peerConnections.current[peerId];
      
      if (!peerConnection) {
        peerConnection = await createPeerConnection(peerId, false);
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit('webrtc-answer', {
        gameId,
        to: peerId,
        from: userId,
        answer: answer
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (peerId, answer) => {
    try {
      const peerConnection = peerConnections.current[peerId];
      
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (peerId, candidate) => {
    try {
      const peerConnection = peerConnections.current[peerId];
      
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const closePeerConnection = (peerId) => {
    const peerConnection = peerConnections.current[peerId];
    
    if (peerConnection) {
      peerConnection.close();
      delete peerConnections.current[peerId];
    }

    setRemoteStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[peerId];
      return newStreams;
    });
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const getPlayerInfo = (playerId) => {
    return players.find(p => p.userId === playerId);
  };

  return (
    <>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsChatOpen(!isChatOpen)}
        className={`
          px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-200
          transform hover:scale-105 active:scale-95 shadow-lg
          ${isChatOpen 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white'
          }
        `}
      >
        {isChatOpen ? '📹 Close Video' : '📹 Start Video Chat'}
      </button>

      {/* Video Chat Panel */}
      {isChatOpen && (
        <div className="fixed right-4 bottom-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up border border-gray-200">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>Video Chat</span>
            </h3>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Local Video */}
          <div className="relative bg-black">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-48 object-cover scale-x-[-1]"
            />
            <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 text-white text-xs rounded-full font-medium">
              You {!isVideoEnabled && '(Camera Off)'}
            </div>
            
            {/* Connection indicator */}
            <div className="absolute top-2 right-2 w-3 h-3 bg-green-500 rounded-full shadow-lg animate-pulse"></div>
          </div>

          {/* Controls */}
          <div className="p-4 bg-gray-50 flex justify-center gap-4 border-y border-gray-200">
            <button 
              onClick={toggleVideo}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center text-xl
                transition-all duration-200 transform hover:scale-110 active:scale-95
                ${isVideoEnabled 
                  ? 'bg-white text-gray-700 shadow-md hover:shadow-lg' 
                  : 'bg-red-500 text-white shadow-lg'
                }
              `}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {isVideoEnabled ? '📹' : '📹❌'}
            </button>
            
            <button 
              onClick={toggleAudio}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center text-xl
                transition-all duration-200 transform hover:scale-110 active:scale-95
                ${isAudioEnabled 
                  ? 'bg-white text-gray-700 shadow-md hover:shadow-lg' 
                  : 'bg-red-500 text-white shadow-lg'
                }
              `}
              title={isAudioEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {isAudioEnabled ? '🎤' : '🎤❌'}
            </button>
          </div>

          {/* Remote Videos */}
          <div className="max-h-80 overflow-y-auto scrollbar-thin p-4 space-y-3 bg-gray-50">
            {Object.entries(remoteStreams).length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">👥</div>
                <p className="text-sm text-gray-600">Waiting for others to join...</p>
              </div>
            ) : (
              Object.entries(remoteStreams).map(([peerId, stream]) => {
                const player = getPlayerInfo(peerId);
                return (
                  <div key={peerId} className="relative bg-black rounded-xl overflow-hidden shadow-lg">
                    <video
                      ref={el => remoteVideoRefs.current[peerId] = el}
                      autoPlay
                      playsInline
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-3 py-1 bg-black/70 text-white text-xs rounded-full font-medium flex items-center gap-2">
                      <span>{player?.avatar}</span>
                      <span>{player?.username || 'Player'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default VideoChat;
