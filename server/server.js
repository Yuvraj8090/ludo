const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
const server = http.createServer(app); // This is your HTTP server

// FIX: 'server' is passed here, not 'httpServer'
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any IP (Computer, Phone, Tablet)
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// ============================================
// IN-MEMORY DATA STORES
// ============================================
const users = new Map();
const games = new Map();
const activeConnections = new Map();
const waitingQueue = [];

// ============================================
// LUDO GAME CONSTANTS
// ============================================
const COLORS = ['red', 'blue', 'green', 'yellow'];
// Safe spots where pieces cannot be captured
const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];
const AVATARS = ['🐶', '🐱', '🐼', '🦊', '🐯', '🦁'];

const STARTING_POSITIONS = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39
};

const HOME_STRETCH_ENTRY = {
  red: 50,
  blue: 11,
  green: 24,
  yellow: 37
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateAnonymousUser() {
  const userId = `anon_${nanoid(10)}`;
  const username = `Player_${Math.floor(1000 + Math.random() * 9000)}`;
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
    pieces: [
      { pieceId: 0, position: -1, isHome: true, isSafe: true },
      { pieceId: 1, position: -1, isHome: true, isSafe: true },
      { pieceId: 2, position: -1, isHome: true, isSafe: true },
      { pieceId: 3, position: -1, isHome: true, isSafe: true }
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
    currentTurn: 0, // Index of the player whose turn it is
    diceRoll: null,
    consecutiveSixes: 0,
    chat: [],
    createdAt: new Date(),
    startedAt: null
  };
  
  games.set(gameId, game);
  return game;
}

// Logic to calculate where a piece lands
function calculateNewPosition(player, piece, diceValue) {
  const color = player.color;
  const startingPos = STARTING_POSITIONS[color];
  const homeEntry = HOME_STRETCH_ENTRY[color];
  
  // 1. Moving out of base (needs 6)
  if (piece.position === -1) {
    return diceValue === 6 ? startingPos : -1;
  }
  
  // 2. Already in victory path (positions 100+)
  if (piece.position >= 100) {
    const newPos = piece.position + diceValue;
    return newPos > 105 ? -2 : newPos; // -2 means overshoot (invalid)
  }
  
  // 3. Normal Movement on Board (0-51)
  let currentPos = piece.position;
  let distToMove = diceValue;
  
  // Check if we are passing our specific Home Entry point
  // We need to handle the board wrap-around logic (51 -> 0)
  
  // Simple path calculation handling the loop
  let virtualPos = currentPos + distToMove;
  
  // Check specifically if we cross the home entry based on color
  // This logic requires care because "crossing" depends on start/end
  
  // Simplified logic: Count steps one by one to see if we enter home
  let testPos = currentPos;
  for(let i=0; i<distToMove; i++) {
     if (testPos === homeEntry) {
         // Entering home stretch!
         // Remaining steps go into 100+
         const remaining = distToMove - i; // remaining steps including this one?
         // No, if we are AT homeEntry, next step is 100.
         return 100 + (distToMove - 1 - i); 
     }
     
     testPos++;
     if (testPos > 51) testPos = 0;
  }
  
  // If we didn't enter home, return the wrapped position
  return testPos;
}

// Simplified version for the game logic above to avoid complex step counting bug
// Replacing the logic above with the robust standard logic:
function calculateNewPositionRobust(player, piece, diceValue) {
    const start = STARTING_POSITIONS[player.color];
    const end = HOME_STRETCH_ENTRY[player.color];
    
    // 1. Start Condition
    if (piece.position === -1) {
        return diceValue === 6 ? start : -1;
    }

    // 2. Already in Home Stretch
    if (piece.position >= 100) {
        const newPos = piece.position + diceValue;
        return newPos > 105 ? -2 : newPos;
    }

    // 3. Normal Board Movement
    let newPos = piece.position + diceValue;

    // Handle board wrapping (0-51)
    // We need to know if we crossed the Home Entry
    // The "distance" logic is better: how far have we traveled from start?
    
    // Easier approach: If the move crosses the `end` index relative to direction
    // Case A: Normal path (e.g. Red 0 -> 50)
    // Case B: Wrap around path (e.g. Green 26 -> 51 -> 0 -> 24)
    
    let willEnterHome = false;
    
    // Check if we are passing the entry point
    if (piece.position <= end && newPos > end && piece.position >= (end - 51)) {
       // This logic is tricky. Let's use the explicit check:
       // Is the home entry between current and new?
       if (piece.position <= end && (piece.position + diceValue) > end) {
           willEnterHome = true;
       }
    } 
    // Wrap around case (e.g., Blue starts 13, ends 11. If pos is 10 and roll 5 -> 15 (overshoots 11))
    else if (end < start && piece.position > end && (piece.position + diceValue) > (52 + end)) {
         // This implies we wrapped 51->0 and passed end
         // Actually, if we are at 50 and roll 5 -> 3. 
         // Blue entry is 11. So 50->3 is fine. 
         // If we are at 10 and roll 5 -> 15. 15 > 11. Enter home.
         if (piece.position <= end && (piece.position + diceValue) > end) {
             willEnterHome = true;
         }
    }
    
    // Let's stick to the simplest proven logic:
    // If (currentPosition -> newPosition) includes 'HomeEntry'
    
    // Normalize positions relative to start to calculate "distance traveled"
    let relPos = piece.position - start;
    if (relPos < 0) relPos += 52;
    
    let relHomeEntry = end - start;
    if (relHomeEntry < 0) relHomeEntry += 52;
    
    const targetDist = relPos + diceValue;
    
    if (targetDist > relHomeEntry) {
        // Entering home stretch
        const extra = targetDist - relHomeEntry - 1;
        const finalPos = 100 + extra;
        return finalPos > 105 ? -2 : finalPos;
    }
    
    // Standard move
    let finalBoardPos = (piece.position + diceValue) % 52;
    return finalBoardPos;
}

function isValidMove(game, player, piece, diceValue) {
  if (piece.position >= 105) return false; // Already finished
  
  // Need 6 to start
  if (piece.position === -1) return diceValue === 6;
  
  const newPos = calculateNewPositionRobust(player, piece, diceValue);
  return newPos !== -2; // -2 is error/overshoot
}

function checkCapture(game, movingPlayer, newPos) {
  // No capture in safe zones or home stretch
  if (SAFE_POSITIONS.includes(newPos) || newPos >= 100 || newPos < 0) return null;

  for (const player of game.players) {
    if (player.userId === movingPlayer.userId) continue;

    for (const piece of player.pieces) {
      if (piece.position === newPos) {
        return {
          playerId: player.userId,
          playerName: player.username,
          pieceId: piece.pieceId,
          pieceObj: piece
        };
      }
    }
  }
  return null;
}

function getNextTurn(game) {
  let nextTurn = (game.currentTurn + 1) % game.players.length;
  // Skip winners
  let attempts = 0;
  while (game.players[nextTurn].hasWon && attempts < 4) {
    nextTurn = (nextTurn + 1) % game.players.length;
    attempts++;
  }
  return nextTurn;
}

// ============================================
// API ROUTES
// ============================================

app.post('/api/auth/anonymous-login', (req, res) => {
  const user = generateAnonymousUser();
  users.set(user.userId, user);
  res.json({ success: true, user });
});

// ============================================
// SOCKET LOGIC
// ============================================

io.on('connection', (socket) => {
  // 1. Connection Handling
  socket.on('user-connected', ({ userId }) => {
    socket.userId = userId;
    activeConnections.set(userId, socket.id);
    const user = users.get(userId);
    if (user) {
      user.status = 'online';
      console.log(`🟢 ${user.username} connected (${socket.handshake.address})`);
    }
  });

  // 2. Matchmaking
  socket.on('find-game', ({ playerCount }) => {
    const userId = socket.userId;
    // Remove if already in queue
    const existingIdx = waitingQueue.findIndex(p => p.userId === userId);
    if (existingIdx > -1) waitingQueue.splice(existingIdx, 1);

    waitingQueue.push({ userId, socketId: socket.id, desiredPlayers: playerCount });
    console.log(`🔍 User ${userId} searching for ${playerCount} players`);

    // Check for match
    const candidates = waitingQueue.filter(p => p.desiredPlayers === playerCount);
    if (candidates.length >= playerCount) {
      // Create Game
      const playersToJoin = candidates.splice(0, playerCount);
      
      // Remove from queue
      playersToJoin.forEach(p => {
         const qIdx = waitingQueue.findIndex(x => x.userId === p.userId);
         if (qIdx > -1) waitingQueue.splice(qIdx, 1);
      });

      const game = createGame(playersToJoin.map(p => p.userId));
      
      // Notify Players
      playersToJoin.forEach(p => {
        const s = io.sockets.sockets.get(p.socketId);
        if (s) {
          s.join(game.gameId);
          s.emit('game-found', { gameId: game.gameId, game });
        }
      });

      console.log(`🎮 Game ${game.gameId} started with ${playerCount} players`);

      // Small delay before "Game Started" animation
      setTimeout(() => {
        io.to(game.gameId).emit('game-started', { gameId: game.gameId });
        io.to(game.gameId).emit('turn-changed', {
           currentPlayer: game.players[0].userId,
           currentPlayerName: game.players[0].username
        });
      }, 1500);
    }
  });

  // 3. Game: Roll Dice
  socket.on('roll-dice', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;

    const player = game.players[game.currentTurn];
    if (player.userId !== socket.userId) return; // Not your turn
    if (game.diceRoll !== null) return; // Already rolled

    // Logic
    const diceValue = Math.floor(Math.random() * 6) + 1;
    game.diceRoll = diceValue;

    // Handle 6s
    if (diceValue === 6) {
       game.consecutiveSixes++;
       if (game.consecutiveSixes === 3) {
           // Skip turn
           game.diceRoll = null;
           game.consecutiveSixes = 0;
           game.currentTurn = getNextTurn(game);
           
           io.to(gameId).emit('dice-rolled', { playerId: player.userId, diceValue, threeSixes: true });
           
           setTimeout(() => {
             io.to(gameId).emit('turn-changed', {
               currentPlayer: game.players[game.currentTurn].userId,
               currentPlayerName: game.players[game.currentTurn].username
             });
           }, 1000);
           return;
       }
    } else {
       game.consecutiveSixes = 0;
    }

    io.to(gameId).emit('dice-rolled', { playerId: player.userId, diceValue });

    // CHECK IF MOVES EXIST
    const hasMoves = player.pieces.some(p => isValidMove(game, player, p, diceValue));
    
    if (!hasMoves) {
        // Auto-skip after 2s
        setTimeout(() => {
            game.diceRoll = null;
            game.currentTurn = getNextTurn(game);
            io.to(gameId).emit('turn-changed', {
                currentPlayer: game.players[game.currentTurn].userId,
                currentPlayerName: game.players[game.currentTurn].username,
                autoSkipped: true
            });
        }, 2000);
    }
  });

  // 4. Game: Move Piece
  socket.on('move-piece', ({ gameId, pieceId }) => {
    const game = games.get(gameId);
    if (!game) return;

    const player = game.players[game.currentTurn];
    if (player.userId !== socket.userId) return;
    if (!game.diceRoll) return;

    const piece = player.pieces[pieceId];
    if (!isValidMove(game, player, piece, game.diceRoll)) {
        return socket.emit('invalid-move', { message: 'Move not allowed' });
    }

    // Execute Move
    const newPos = calculateNewPositionRobust(player, piece, game.diceRoll);
    const oldPos = piece.position;
    
    // Check Capture
    const capture = checkCapture(game, player, newPos);
    if (capture) {
        capture.pieceObj.position = -1; // Send home
        capture.pieceObj.isHome = true;
        io.to(gameId).emit('piece-captured', { 
            capturingPlayer: player.username, 
            capturedPlayer: capture.playerName 
        });
    }

    // Update Piece
    piece.position = newPos;
    piece.isHome = false;
    
    io.to(gameId).emit('piece-moved', {
        playerId: player.userId,
        pieceId: pieceId,
        newPosition: newPos,
        color: player.color
    });

    // Check Win
    if (newPos === 105) { // Reached center
        // Check if all pieces are home
        const allHome = player.pieces.every(p => p.position === 105);
        if (allHome) {
            player.hasWon = true;
            io.to(gameId).emit('player-won', { playerName: player.username, position: 1 });
            // End game logic here if needed
        }
    }

    // Determine Next Turn
    // If rolled 6, roll again. Otherwise next player.
    if (game.diceRoll === 6 && !player.hasWon) {
        game.diceRoll = null;
        io.to(gameId).emit('extra-turn', { playerId: player.userId });
    } else {
        game.diceRoll = null;
        game.currentTurn = getNextTurn(game);
        io.to(gameId).emit('turn-changed', {
            currentPlayer: game.players[game.currentTurn].userId,
            currentPlayerName: game.players[game.currentTurn].username
        });
    }
  });
  
  // Chat
  socket.on('send-message', ({ gameId, message }) => {
      const user = users.get(socket.userId);
      if(user) io.to(gameId).emit('new-message', { username: user.username, message });
  });

  socket.on('disconnect', () => {
    activeConnections.delete(socket.userId);
    // Remove from queue if disconnected
    const idx = waitingQueue.findIndex(p => p.userId === socket.userId);
    if(idx > -1) waitingQueue.splice(idx, 1);
  });
});

// Start Server
const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});