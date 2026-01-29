import React from 'react';

// Coordinates mapping for the 52 steps + Home Stretch
// This logic maps a 0-51 index to visual coordinates (x, y) on a 15x15 grid
const getCoordinates = (position, color) => {
  // Simple path map for the main loop (approximate for standard Ludo)
  // You might need to tweak these specific X/Y values to match your specific SVG background perfectly
  // This is a simplified logic: 0 is start of Red, etc.
  
  // NOTE: For a production app, you usually map index 0-51 to specific X,Y percentages manually.
  // Here is a helper to place them based on standard grid logic.
  
  // Example Return: { top: '40%', left: '20%' }
  
  // IF PIECE IS HOME (-1)
  if (position === -1) {
    // Base positions based on color
    if (color === 'red') return { top: '15%', left: '15%' };
    if (color === 'green') return { top: '15%', left: '85%' };
    if (color === 'blue') return { top: '85%', left: '85%' };
    if (color === 'yellow') return { top: '85%', left: '15%' };
  }

  // IF PIECE IS FINISHED (>= 100)
  if (position >= 100) {
    return { top: '50%', left: '50%' }; // Center of board
  }

  // LOGIC FOR PATH (Simplified for brevity - assumes standard Ludo path)
  // In a real scenario, you define an array of 52 {top, left} objects.
  // For now, let's use a function that calculates based on SVG path.
  // ... (Insert heavy coordinate mapping logic here or use a preset array)
  // TO MAKE THIS WORK IMMEDIATELY, WE WILL USE THE MATH FROM YOUR OLD APP.JSX
  
  const angle = (position / 52) * 360;
  const radius = 40; // Percentage radius
  const x = 50 + radius * Math.cos(angle * Math.PI / 180);
  const y = 50 + radius * Math.sin(angle * Math.PI / 180);
  
  return { top: `${y}%`, left: `${x}%` };
};

const GameBoard = ({ gameState, userId, isMyTurn, diceValue, onMovePiece }) => {
  if (!gameState) return null;

  return (
    <div className="ludo-board">
      {/* 1. THE BOARD IMAGE (SVG Background) */}
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', position: 'absolute' }}>
        <rect width="100" height="100" fill="white" />
        {/* Safe Zones / Colors */}
        <rect x="0" y="0" width="40" height="40" fill="#ef4444" opacity="0.2" /> {/* Red Base */}
        <rect x="60" y="0" width="40" height="40" fill="#22c55e" opacity="0.2" /> {/* Green Base */}
        <rect x="60" y="60" width="40" height="40" fill="#3b82f6" opacity="0.2" /> {/* Blue Base */}
        <rect x="0" y="60" width="40" height="40" fill="#eab308" opacity="0.2" /> {/* Yellow Base */}
        
        {/* Center */}
        <polygon points="40,40 60,40 60,60 40,60" fill="#333" />
        
        {/* The Track (Visual Guide) */}
        <circle cx="50" cy="50" r="40" stroke="#ddd" strokeWidth="5" fill="none" />
      </svg>

      {/* 2. THE PIECES (Dom Elements for Animation) */}
      {gameState.players.map((player) => (
        player.pieces.map((piece, idx) => {
          const style = getCoordinates(piece.position, player.color);
          
          // Offset overlap if multiple pieces are on same spot
          // (Simple logic: shift slightly based on ID)
          const offset = idx * 2; 

          const isClickable = isMyTurn && 
                              diceValue !== null && 
                              player.userId === userId &&
                              piece.position < 100; // Not finished

          return (
            <div
              key={`${player.userId}-${piece.pieceId}`}
              className={`piece ${isClickable ? 'clickable' : ''}`}
              style={{
                backgroundColor: player.color,
                top: `calc(${style.top} + ${offset}px)`, // Slight offset for stack
                left: `calc(${style.left} + ${offset}px)`,
                cursor: isClickable ? 'pointer' : 'default'
              }}
              onClick={() => isClickable && onMovePiece(piece.pieceId)}
            />
          );
        })
      ))}
    </div>
  );
};

export default GameBoard;