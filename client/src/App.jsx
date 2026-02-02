import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import ChatBox from './components/ChatBox';

// Change this to your computer's IP if testing on mobile
const SOCKET_URL = 'http://localhost:3000'; 

function App() {
  const [socket, setSocket] = useState(null);
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [inLobby, setInLobby] = useState(false);
  const [messages, setMessages] = useState([]);
  const [notification, setNotification] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  
  // Audio refs
  const moveSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'));
  const winSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'));

  // 1. Initialize Socket & User
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Login immediately
    fetch(`${SOCKET_URL}/api/auth/anonymous-login`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        newSocket.emit('user-connected', { userId: data.user.userId });
      })
      .catch(err => console.error("Login failed:", err));

    return () => newSocket.disconnect();
  }, []);

  // 2. Socket Event Listeners
  useEffect(() => {
    if (!socket || !user) return;

    // Game Flow
    socket.on('game-found', ({ game }) => {
      setInLobby(false);
      setGameState(game);
      setMessages([]);
      showToast("Game Found!", "success");
    });

    socket.on('game-started', () => {
      showToast("Game Started!", "info");
    });

    socket.on('turn-changed', ({ currentPlayerName }) => {
      setGameState(prev => ({ ...prev, diceRoll: null })); // Reset dice UI
      setDiceRolling(false);
    });

    socket.on('dice-rolled', ({ playerId, diceValue }) => {
      setDiceRolling(true);
      setTimeout(() => {
        setDiceRolling(false);
        setGameState(prev => ({ ...prev, diceRoll: diceValue }));
      }, 500); // 500ms rolling animation
    });

    socket.on('piece-moved', ({ playerId, pieceId, newPosition, color }) => {
      moveSound.current.play().catch(e => {});
      setGameState(prev => {
        const newState = { ...prev };
        const player = newState.players.find(p => p.userId === playerId);
        if (player) {
          player.pieces[pieceId].position = newPosition;
          player.pieces[pieceId].isHome = false;
        }
        return newState;
      });
    });

    socket.on('piece-captured', ({ capturedPlayer }) => {
      showToast(`${capturedPlayer} was captured!`, "error");
    });

    socket.on('player-won', ({ playerName, position }) => {
      winSound.current.play().catch(e => {});
      showToast(`${playerName} finished ${position}!`, "success");
    });

    socket.on('new-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('error', ({ message }) => showToast(message, "error"));

    return () => {
      socket.off('game-found');
      socket.off('game-started');
      socket.off('turn-changed');
      socket.off('dice-rolled');
      socket.off('piece-moved');
      socket.off('piece-captured');
      socket.off('player-won');
      socket.off('new-message');
      socket.off('error');
    };
  }, [socket, user]);

  // Actions
  const findGame = (players) => {
    setInLobby(true);
    socket.emit('find-game', { playerCount: players });
  };

  const showToast = (msg, type) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- RENDERING ---

  if (!user) return <div className="h-screen flex items-center justify-center bg-purple-600 text-white font-bold text-2xl animate-pulse">Loading Ludo...</div>;

  // LOBBY SCREEN
  if (inLobby) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <div className="w-16 h-16 border-4 border-t-purple-500 border-white rounded-full animate-spin mb-6"></div>
        <h2 className="text-3xl font-bold mb-2">Searching for Opponents...</h2>
        <p className="text-slate-400 mb-8">Please wait while we match you.</p>
        <button onClick={() => setInLobby(false)} className="bg-red-500 hover:bg-red-600 px-8 py-3 rounded-full font-bold transition">Cancel</button>
      </div>
    );
  }

  // HOME SCREEN
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-6xl mb-2">🎲</h1>
          <h1 className="text-4xl font-extrabold text-slate-800 mb-2">Ludo King Clone</h1>
          <p className="text-slate-500 mb-8">Real-time Multiplayer</p>
          
          <div className="space-y-4">
            <button onClick={() => findGame(2)} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl text-xl font-bold shadow-lg transform transition hover:scale-105">
              Play 1 vs 1
            </button>
            <button onClick={() => findGame(4)} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-xl text-xl font-bold shadow-lg transform transition hover:scale-105">
              4 Player Match
            </button>
          </div>
          
          <div className="mt-8 pt-4 border-t text-sm text-slate-400">
            Playing as: <span className="font-bold text-slate-600">{user.username}</span>
          </div>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row items-center justify-center p-2 lg:p-8 gap-6">
      
      {/* Notifications */}
      {notification && (
        <div className={`fixed top-10 z-50 px-6 py-3 rounded-full text-white font-bold shadow-xl animate-bounce 
          ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {notification.msg}
        </div>
      )}

      {/* LEFT: Game Board */}
      <div className="flex-1 flex justify-center w-full max-w-[650px]">
        <GameBoard 
          gameState={gameState} 
          userId={user.userId} 
          socket={socket} 
          diceRolling={diceRolling}
        />
      </div>

      {/* RIGHT: Controls & Chat */}
      <div className="w-full lg:w-96 flex flex-col gap-4 h-[600px]">
        <GameControls 
          gameState={gameState} 
          userId={user.userId} 
          socket={socket} 
          diceRolling={diceRolling}
        />
        <ChatBox 
          socket={socket} 
          gameId={gameState.gameId} 
          messages={messages} 
          currentUser={user}
        />
      </div>
    </div>
  );
}

export default App;