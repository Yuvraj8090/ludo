const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"], // Allow Vite and local
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// ============================================
// IN-MEMORY DATA STORES
// ============================================
const users = new Map();           // userId -> user object
const games = new Map();           // gameId -> game object
const activeConnections = new Map(); // userId -> socketId
const waitingQueue = [];           // Array of waiting players

// ============================================
// CONSTANTS
// ============================================
const COLORS = ['red', 'blue', 'green', 'yellow'];
const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
const AVATARS = ['🐶', '🐱', '🐼', '🦊', '🐯', '🦁'];

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateAnonymousUser() {
  const userId = `anon_${nanoid(10)}`;
  const username = `Player_${Math.floor(Math.random() * 9999)}`;
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  
  return {
    userId,
    username,
    avatar,
    status: 'online',
    gamesPlayed: 0,
    gamesWon: 0,
    createdAt: new Date()
  };
}

function initializePlayer(user, colorIndex) {
  return {
    userId: user.userId,
    username: user.username,
    avatar: user.avatar,
    color: COLORS[colorIndex],
    position: colorIndex,
    pieces: [
      { pieceId: 0, position: -1, isHome: true },
      { pieceId: 1, position: -1, isHome: true },
      { pieceId: 2, position: -1, isHome: true },
      { pieceId: 3, position: -1, isHome: true }
    ],
    hasWon: false,
    finishPosition: null
  };
}

function createGame(playerIds, isPrivate = false) {
  const gameId = `game_${nanoid(8)}`;
  const roomCode = isPrivate ? nanoid(6).toUpperCase() : null;
  
  const players = playerIds.map((userId, idx) => {
    const user = users.get(userId);
    return initializePlayer(user, idx);
  });
  
  const game = {
    gameId,
    roomCode,
    isPrivate,
    status: 'waiting',
    players,
    currentTurn: 0,
    diceRoll: null,
    consecutiveSixes: 0,
    chat: [],
    createdAt: new Date(),
    startedAt: null
  };
  
  games.set(gameId, game);
  return game;
}

function isValidMove(game, player, piece, diceValue) {
  if (piece.position === -1 && diceValue !== 6) return false;
  if (piece.position >= 100) return false;
  return true;
}

function calculateNewPosition(player, piece, diceValue) {
  const colorIndex = COLORS.indexOf(player.color);
  const startPos = colorIndex * 13;
  
  if (piece.position === -1) return startPos;
  
  let newPos = piece.position + diceValue;
  const homeStretchStart = startPos + 50;
  
  if (piece.position < homeStretchStart && newPos >= homeStretchStart) {
    const overshoot = newPos - homeStretchStart;
    return 100 + overshoot;
  }
  
  if (piece.position >= 100) {
    const newHomePos = piece.position + diceValue;
    if (newHomePos > 105) return -2; // overshoot
    return newHomePos;
  }
  
  return newPos % 52;
}

function checkCapture(game, movingPlayer, movedPiece) {
  const position = movedPiece.position;
  if (SAFE_POSITIONS.includes(position) || position >= 100 || position < 0) return null;
  
  for (const player of game.players) {
    if (player.userId === movingPlayer.userId) continue;
    for (const piece of player.pieces) {
      if (piece.position === position) {
        piece.position = -1;
        piece.isHome = true;
        return { playerId: player.userId, playerName: player.username, pieceId: piece.pieceId };
      }
    }
  }
  return null;
}

function checkWin(player) {
  return player.pieces.every(piece => piece.position >= 100 && piece.position <= 105);
}

function canPlayerMove(player, diceValue) {
  return player.pieces.some(piece => {
    if (piece.position === -1 && diceValue !== 6) return false;
    if (piece.position >= 100) {
      const newPos = piece.position + diceValue;
      return newPos <= 105;
    }
    return true;
  });
}

function getNextTurn(game) {
  let nextTurn = (game.currentTurn + 1) % game.players.length;
  while (game.players[nextTurn].hasWon) {
    nextTurn = (nextTurn + 1) % game.players.length;
  }
  return nextTurn;
}

// ============================================
// REST API ENDPOINTS
// ============================================

app.post('/api/auth/anonymous-login', (req, res) => {
  const user = generateAnonymousUser();
  users.set(user.userId, user);
  res.json({ success: true, user });
});

// ============================================
// SOCKET.IO EVENTS
// ============================================

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('user-connected', ({ userId }) => {
    socket.userId = userId;
    activeConnections.set(userId, socket.id);
    const user = users.get(userId);
    if (user) user.status = 'online';
  });
  
  // --- EXISTING GAME LOGIC ---
  
  socket.on('find-game', ({ playerCount = 4 }) => {
    const userId = socket.userId;
    const user = users.get(userId);
    if (!user) return; // Handle error
    
    waitingQueue.push({ userId, socketId: socket.id, desiredPlayers: playerCount, joinedAt: Date.now() });
    
    const compatiblePlayers = waitingQueue.filter(p => p.desiredPlayers === playerCount);
    if (compatiblePlayers.length >= playerCount) {
      const matchedPlayers = compatiblePlayers.slice(0, playerCount);
      const playerIds = matchedPlayers.map(p => p.userId);
      const game = createGame(playerIds, false);
      
      matchedPlayers.forEach(p => {
        const idx = waitingQueue.findIndex(wp => wp.userId === p.userId);
        if (idx > -1) waitingQueue.splice(idx, 1);
        const playerSocket = io.sockets.sockets.get(p.socketId);
        if (playerSocket) {
          playerSocket.join(game.gameId);
          playerSocket.emit('game-found', { gameId: game.gameId, game });
        }
      });
      
      setTimeout(() => {
        game.status = 'active';
        game.startedAt = new Date();
        io.to(game.gameId).emit('game-started', { gameId: game.gameId });
      }, 3000);
    }
  });

  socket.on('roll-dice', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;
    const currentPlayer = game.players[game.currentTurn];
    if (currentPlayer.userId !== socket.userId) return; // Not turn
    if (game.diceRoll !== null) return; // Already rolled
    
    const diceValue = Math.floor(Math.random() * 6) + 1;
    game.diceRoll = diceValue;
    
    if (diceValue === 6) {
      game.consecutiveSixes++;
      if (game.consecutiveSixes >= 3) {
        game.consecutiveSixes = 0;
        game.diceRoll = null;
        game.currentTurn = getNextTurn(game);
        io.to(gameId).emit('dice-rolled', { gameId, playerId: currentPlayer.userId, diceValue, threeSixes: true });
        io.to(gameId).emit('turn-changed', { gameId, currentPlayer: game.players[game.currentTurn].userId, currentPlayerName: game.players[game.currentTurn].username });
        return;
      }
    } else {
      game.consecutiveSixes = 0;
    }
    
    io.to(gameId).emit('dice-rolled', { gameId, playerId: currentPlayer.userId, diceValue });
    
    if (!canPlayerMove(currentPlayer, diceValue)) {
      setTimeout(() => {
        const latestGame = games.get(gameId);
        if (latestGame && latestGame.diceRoll === diceValue) {
          latestGame.diceRoll = null;
          latestGame.currentTurn = getNextTurn(latestGame);
          io.to(gameId).emit('turn-changed', { gameId, currentPlayer: latestGame.players[latestGame.currentTurn].userId, currentPlayerName: latestGame.players[latestGame.currentTurn].username, autoSkipped: true });
        }
      }, 2000);
    }
  });

  socket.on('move-piece', ({ gameId, pieceId }) => {
    const game = games.get(gameId);
    if (!game) return;
    const currentPlayer = game.players[game.currentTurn];
    if (currentPlayer.userId !== socket.userId) return;
    if (game.diceRoll === null) return;
    
    const piece = currentPlayer.pieces[pieceId];
    const diceValue = game.diceRoll;
    
    if (!isValidMove(game, currentPlayer, piece, diceValue)) return;
    
    const newPosition = calculateNewPosition(currentPlayer, piece, diceValue);
    if (newPosition === -2) return;
    
    const oldPosition = piece.position;
    piece.position = newPosition;
    piece.isHome = false;
    
    const captured = checkCapture(game, currentPlayer, piece);
    if (captured) {
      io.to(gameId).emit('piece-captured', { gameId, capturingPlayer: currentPlayer.username, capturedPlayer: captured.playerName, pieceId: captured.pieceId });
    }
    
    io.to(gameId).emit('piece-moved', { gameId, playerId: currentPlayer.userId, pieceId, oldPosition, newPosition, color: currentPlayer.color });
    
    if (checkWin(currentPlayer)) {
      currentPlayer.hasWon = true;
      const finishPosition = game.players.filter(p => p.hasWon).length;
      currentPlayer.finishPosition = finishPosition;
      io.to(gameId).emit('player-won', { gameId, playerId: currentPlayer.userId, playerName: currentPlayer.username, position: finishPosition });
      
      const activePlayers = game.players.filter(p => !p.hasWon);
      if (activePlayers.length <= 1) {
        game.status = 'completed';
        io.to(gameId).emit('game-ended', { gameId, winners: game.players.filter(p => p.hasWon).sort((a, b) => a.finishPosition - b.finishPosition) });
        return;
      }
    }
    
    game.diceRoll = null;
    if (diceValue === 6 && !currentPlayer.hasWon) {
      io.to(gameId).emit('extra-turn', { gameId, playerId: currentPlayer.userId });
    } else {
      game.currentTurn = getNextTurn(game);
      io.to(gameId).emit('turn-changed', { gameId, currentPlayer: game.players[game.currentTurn].userId, currentPlayerName: game.players[game.currentTurn].username });
    }
  });

  socket.on('send-message', ({ gameId, message }) => {
    const game = games.get(gameId);
    if (!game) return;
    const user = users.get(socket.userId);
    const chatMessage = { userId: user.userId, username: user.username, avatar: user.avatar, message, timestamp: new Date() };
    game.chat.push(chatMessage);
    io.to(gameId).emit('new-message', { gameId, ...chatMessage });
  });

  // ==========================================
  // --- VIDEO CHAT SIGNALING START ---
  // ==========================================

  // 1. User wants to join video chat
  socket.on('join-video', ({ roomId, userId }) => {
    // Notify others in the room that a user has joined video
    // to: roomId (broadcast to everyone in room except sender)
    socket.to(roomId).emit('user-connected-video', { userId: socket.id }); // Using socket.id for WebRTC signaling
  });

  // 2. Relay WebRTC Offer
  socket.on('offer', ({ offer, to }) => {
    io.to(to).emit('offer', { offer, from: socket.id });
  });

  // 3. Relay WebRTC Answer
  socket.on('answer', ({ answer, to }) => {
    io.to(to).emit('answer', { answer, from: socket.id });
  });

  // 4. Relay ICE Candidates (Network path info)
  socket.on('ice-candidate', ({ candidate, to }) => {
    io.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });

  // 5. User manually leaves video
  socket.on('leave-video', ({ roomId }) => {
    socket.to(roomId).emit('user-disconnected-video', { userId: socket.id });
  });

  // ==========================================
  // --- VIDEO CHAT SIGNALING END ---
  // ==========================================

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const userId = socket.userId;
    if (userId) {
      activeConnections.delete(userId);
      const user = users.get(userId);
      if (user) user.status = 'offline';
      
      const idx = waitingQueue.findIndex(p => p.socketId === socket.id);
      if (idx > -1) waitingQueue.splice(idx, 1);

      // Notify video peers of disconnect
      io.emit('user-disconnected-video', { userId: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Ludo Game Server running on port ${PORT}`);
});