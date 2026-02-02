import React from 'react';

const GameBoard = ({ gameState, onMovePiece, isMyTurn, diceValue, userId, validMoves }) => {
  
  // 15x15 Grid Coordinate System
  const MAIN_PATH_COORDS = [
    { x: 6.66 * 1.5, y: 6.66 * 6.5 }, { x: 6.66 * 2.5, y: 6.66 * 6.5 }, { x: 6.66 * 3.5, y: 6.66 * 6.5 }, 
    { x: 6.66 * 4.5, y: 6.66 * 6.5 }, { x: 6.66 * 5.5, y: 6.66 * 6.5 }, { x: 6.66 * 6.5, y: 6.66 * 5.5 },
    { x: 6.66 * 6.5, y: 6.66 * 4.5 }, { x: 6.66 * 6.5, y: 6.66 * 3.5 }, { x: 6.66 * 6.5, y: 6.66 * 2.5 }, 
    { x: 6.66 * 6.5, y: 6.66 * 1.5 }, { x: 6.66 * 6.5, y: 6.66 * 0.5 }, { x: 6.66 * 7.5, y: 6.66 * 0.5 },
    { x: 6.66 * 8.5, y: 6.66 * 0.5 }, { x: 6.66 * 8.5, y: 6.66 * 1.5 }, { x: 6.66 * 8.5, y: 6.66 * 2.5 }, 
    { x: 6.66 * 8.5, y: 6.66 * 3.5 }, { x: 6.66 * 8.5, y: 6.66 * 4.5 }, { x: 6.66 * 8.5, y: 6.66 * 5.5 },
    { x: 6.66 * 9.5, y: 6.66 * 6.5 }, { x: 6.66 * 10.5, y: 6.66 * 6.5 }, { x: 6.66 * 11.5, y: 6.66 * 6.5 }, 
    { x: 6.66 * 12.5, y: 6.66 * 6.5 }, { x: 6.66 * 13.5, y: 6.66 * 6.5 }, { x: 6.66 * 14.5, y: 6.66 * 6.5 },
    { x: 6.66 * 14.5, y: 6.66 * 7.5 }, { x: 6.66 * 14.5, y: 6.66 * 8.5 }, { x: 6.66 * 13.5, y: 6.66 * 8.5 }, 
    { x: 6.66 * 12.5, y: 6.66 * 8.5 }, { x: 6.66 * 11.5, y: 6.66 * 8.5 }, { x: 6.66 * 10.5, y: 6.66 * 8.5 }, 
    { x: 6.66 * 9.5, y: 6.66 * 8.5 }, { x: 6.66 * 8.5, y: 6.66 * 9.5 }, { x: 6.66 * 8.5, y: 6.66 * 10.5 }, 
    { x: 6.66 * 8.5, y: 6.66 * 11.5 }, { x: 6.66 * 8.5, y: 6.66 * 12.5 }, { x: 6.66 * 8.5, y: 6.66 * 13.5 }, 
    { x: 6.66 * 8.5, y: 6.66 * 14.5 }, { x: 6.66 * 7.5, y: 6.66 * 14.5 }, { x: 6.66 * 6.5, y: 6.66 * 14.5 }, 
    { x: 6.66 * 6.5, y: 6.66 * 13.5 }, { x: 6.66 * 6.5, y: 6.66 * 12.5 }, { x: 6.66 * 6.5, y: 6.66 * 11.5 }, 
    { x: 6.66 * 6.5, y: 6.66 * 10.5 }, { x: 6.66 * 6.5, y: 6.66 * 9.5 }, { x: 6.66 * 5.5, y: 6.66 * 8.5 },
    { x: 6.66 * 4.5, y: 6.66 * 8.5 }, { x: 6.66 * 3.5, y: 6.66 * 8.5 }, { x: 6.66 * 2.5, y: 6.66 * 8.5 }, 
    { x: 6.66 * 1.5, y: 6.66 * 8.5 }, { x: 6.66 * 0.5, y: 6.66 * 8.5 }, { x: 6.66 * 0.5, y: 6.66 * 7.5 }, 
    { x: 6.66 * 0.5, y: 6.66 * 6.5 }
  ];

  const getCoordinates = (piece, playerColor) => {
    if (piece.position === -1) {
        // Base Positions
        switch(playerColor) {
            case 'red': return { x: 20 + (piece.pieceId % 2)*10, y: 20 + Math.floor(piece.pieceId/2)*10 };
            case 'blue': return { x: 70 + (piece.pieceId % 2)*10, y: 20 + Math.floor(piece.pieceId/2)*10 };
            case 'green': return { x: 70 + (piece.pieceId % 2)*10, y: 70 + Math.floor(piece.pieceId/2)*10 };
            case 'yellow': return { x: 20 + (piece.pieceId % 2)*10, y: 70 + Math.floor(piece.pieceId/2)*10 };
            default: return { x: 50, y: 50 };
        }
    }
    if (piece.position >= 106) return { x: 50, y: 50 };

    if (piece.position >= 100) {
        const step = piece.position - 100;
        switch(playerColor) {
            case 'red': return { x: 6.66 * (1 + step), y: 50 };
            case 'blue': return { x: 50, y: 6.66 * (1 + step) };
            case 'green': return { x: 100 - (6.66 * (1 + step)), y: 50 };
            case 'yellow': return { x: 50, y: 100 - (6.66 * (1 + step)) };
            default: return { x: 50, y: 50 };
        }
    }

    const coord = MAIN_PATH_COORDS[piece.position % 52];
    return coord || { x: 50, y: 50 };
  };

  return (
    <div className="w-full max-w-[600px] aspect-square relative bg-white rounded-lg shadow-2xl mx-auto border-4 border-gray-800">
        
        {/* BACKGROUND IMAGE (SVG) */}
        <div className="absolute inset-0 z-0">
           <svg viewBox="0 0 100 100" className="w-full h-full">
              <rect x="0" y="0" width="40" height="40" fill="#ff4d4d" stroke="black" strokeWidth="0.5" />
              <rect x="60" y="0" width="40" height="40" fill="#4da6ff" stroke="black" strokeWidth="0.5" />
              <rect x="60" y="60" width="40" height="40" fill="#4dff88" stroke="black" strokeWidth="0.5" />
              <rect x="0" y="60" width="40" height="40" fill="#ffff4d" stroke="black" strokeWidth="0.5" />
              <rect x="8" y="8" width="24" height="24" fill="white" />
              <rect x="68" y="8" width="24" height="24" fill="white" />
              <rect x="68" y="68" width="24" height="24" fill="white" />
              <rect x="8" y="68" width="24" height="24" fill="white" />
              <polygon points="40,40 60,40 60,60 40,60" fill="white" />
              <polygon points="40,40 50,50 40,60" fill="#ff4d4d" />
              <polygon points="40,40 50,50 60,40" fill="#4da6ff" />
              <polygon points="60,40 50,50 60,60" fill="#4dff88" />
              <polygon points="40,60 50,50 60,60" fill="#ffff4d" />
              <line x1="40" y1="0" x2="40" y2="100" stroke="black" strokeWidth="0.2" />
              <line x1="60" y1="0" x2="60" y2="100" stroke="black" strokeWidth="0.2" />
              <line x1="0" y1="40" x2="100" y2="40" stroke="black" strokeWidth="0.2" />
              <line x1="0" y1="60" x2="100" y2="60" stroke="black" strokeWidth="0.2" />
           </svg>
        </div>

        {/* PIECES LAYER */}
        <div className="absolute inset-0 z-10">
            {gameState?.players.map(player => 
                player.pieces.map(piece => {
                    const pos = getCoordinates(piece, player.color);
                    
                    const isMyPiece = player.userId === userId;
                    const canMoveThis = isMyTurn && isMyPiece && diceValue !== null && 
                        (piece.position !== -1 || diceValue === 6) &&
                        piece.position < 106;

                    return (
                        <div
                            key={`${player.color}-${piece.pieceId}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (canMoveThis) {
                                  onMovePiece(piece.pieceId);
                                } else if (isMyTurn && isMyPiece && diceValue && piece.position === -1) {
                                  // --- NEW: FEEDBACK WHEN CLICKING LOCKED PIECE ---
                                  alert(`You need a 6 to open this piece! You rolled a ${diceValue}.`);
                                }
                            }}
                            className={`
                                absolute w-[5%] h-[5%] rounded-full border-2 border-white shadow-md
                                flex items-center justify-center transition-all duration-500 ease-in-out
                                ${canMoveThis ? 'cursor-pointer animate-bounce ring-4 ring-yellow-400 z-50' : 'z-10'}
                                ${!canMoveThis && isMyTurn && isMyPiece ? 'cursor-not-allowed opacity-80' : ''}
                            `}
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: player.color === 'yellow' ? '#e6e600' : player.color,
                                opacity: piece.position >= 106 ? 0.5 : 1
                            }}
                        >
                            <div className="w-1/2 h-1/2 rounded-full bg-black opacity-20"></div>
                        </div>
                    );
                })
            )}
        </div>
    </div>
  );
};

export default GameBoard;