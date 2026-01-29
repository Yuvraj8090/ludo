import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import VideoChat from './VideoChat';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import ChatBox from './components/ChatBox';
import './App.css';

// SERVER CONNECTION
const socket = io('http://localhost:3000'); // Update if using Render/Railway

function App() {
  // --- STATE ---
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [inLobby, setInLobby] = useState(false);
  const [diceValue, setDiceValue] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [showVideo, setShowVideo] = useState(false);
  const [notification, setNotification] = useState('');

  // --- INITIAL LOAD ---
  useEffect(() => {
    // Check local storage or fetch anonymous user
    fetch('http://localhost:3000/api/auth/anonymous-login', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        socket.emit('user-connected', { userId: data.user.userId });
      });
  }, []);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!user) return;

    socket.on('game-found', ({ game }) => {
      setGameState(game);
      setInLobby(false);
      showNotification("Game Found!");
    });

    socket.on('dice-rolled', ({ playerId, diceValue }) => {
      setDiceValue(diceValue); // Update dice UI for everyone
    });

    socket.on('turn-changed', ({ currentPlayer }) => {
      // Logic handled in useEffect below regarding isMyTurn
      setDiceValue(null); // Reset dice
    });
    
    // We listen to 'game-state-sync' or individual events
    socket.on('piece-moved', ({ playerId, pieceId, newPosition }) => {
      setGameState(prev => {
        // Deep copy to update nested state safely
        const newState = JSON.parse(JSON.stringify(prev));
        const player = newState.players.find(p => p.userId === playerId);
        const piece = player.pieces.find(p => p.pieceId === pieceId);
        piece.position = newPosition;
        return newState;
      });
    });

    socket.on('piece-captured', ({ capturingPlayer, capturedPlayer }) => {
      showNotification(`⚔️ ${capturingPlayer} captured ${capturedPlayer}!`);
    });

    socket.on('new-message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('game-found');
      socket.off('dice-rolled');
      socket.off('turn-changed');
      socket.off('piece-moved');
      socket.off('piece-captured');
      socket.off('new-message');
    };
  }, [user]);

  // --- DERIVED STATE ---
  useEffect(() => {
    if (gameState && user) {
      const currentPlayer = gameState.players[gameState.currentTurn];
      setIsMyTurn(currentPlayer.userId === user.userId);
    }
  }, [gameState, user]); // Re-run whenever game state updates

  // --- HANDLERS ---
  const handleFindGame = (count) => {
    setInLobby(true);
    socket.emit('find-game', { playerCount: count });
  };

  const handleRollDice = () => {
    socket.emit('roll-dice', { gameId: gameState.gameId });
  };

  const handleMovePiece = (pieceId) => {
    socket.emit('move-piece', { gameId: gameState.gameId, pieceId });
  };

  const handleSendMessage = (text) => {
    socket.emit('send-message', { gameId: gameState.gameId, message: text });
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // --- RENDER HELPERS ---
  if (!user) return <div className="loading-screen">Loading Ludo...</div>;

  if (inLobby) {
    return (
      <div className="lobby-screen">
        <div className="spinner"></div>
        <h2>Looking for opponents...</h2>
        <button className="cancel-btn" onClick={() => setInLobby(false)}>Cancel</button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="home-screen">
        <h1>🎲 Ludo Master</h1>
        <div className="profile-card">
          <div className="avatar">{user.avatar}</div>
          <h3>{user.username}</h3>
        </div>
        <div className="menu-buttons">
          <button onClick={() => handleFindGame(2)}>2 Players</button>
          <button onClick={() => handleFindGame(4)}>4 Players</button>
        </div>
      </div>
    );
  }

  // --- MAIN GAME UI ---
  return (
    <div className="game-layout">
      {/* 1. LEFT SIDEBAR (Players & Controls) */}
      <div className="sidebar">
        <h3>Players</h3>
        {gameState.players.map((p, i) => (
          <div 
            key={p.userId} 
            className={`player-card ${i === gameState.currentTurn ? 'active-turn' : ''}`}
            style={{ 
              borderLeft: `5px solid ${p.color}`,
              background: i === gameState.currentTurn ? 'rgba(255,255,255,0.2)' : 'transparent',
              padding: '10px',
              marginBottom: '5px'
            }}
          >
            {p.avatar} {p.username}
          </div>
        ))}

        <GameControls 
          isMyTurn={isMyTurn}
          diceValue={diceValue}
          onRollDice={handleRollDice}
          currentPlayerName={gameState.players[gameState.currentTurn].username}
        />
        
        <button 
          onClick={() => setShowVideo(true)}
          style={{ marginTop: '20px', background: '#22c55e', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}
        >
          📹 Open Video Chat
        </button>
      </div>

      {/* 2. CENTER (The Board) */}
      <div className="board-container">
        {notification && <div className="toast-notification">{notification}</div>}
        
        <GameBoard 
          gameState={gameState} 
          userId={user.userId} 
          isMyTurn={isMyTurn}
          diceValue={diceValue}
          onMovePiece={handleMovePiece}
        />
      </div>

      {/* 3. RIGHT SIDEBAR (Chat) */}
      <div className="sidebar">
        <ChatBox 
          messages={chatMessages}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* 4. VIDEO OVERLAY */}
      {showVideo && (
        <VideoChat 
          socket={socket} 
          roomId={gameState.gameId} 
          userId={user.userId} 
          onClose={() => setShowVideo(false)} 
        />
      )}
    </div>
  );
}

export default App;