import React from 'react';

const GameControls = ({ isMyTurn, diceValue, onRollDice, canMove, currentPlayerName }) => {
  
  let statusText = "";
  let subText = "";
  let statusColor = "text-gray-800";

  if (!isMyTurn) {
    statusText = `Waiting for ${currentPlayerName}...`;
    subText = "Please wait";
    statusColor = "text-gray-400";
  } else if (diceValue === null) {
    statusText = "YOUR TURN!";
    subText = "Click the dice to roll";
    statusColor = "text-green-600";
  } else if (canMove) {
    statusText = `You rolled a ${diceValue}`;
    subText = "Select a glowing piece to move";
    statusColor = "text-purple-600";
  } else {
    // THIS HANDLES YOUR ISSUE
    statusText = `You rolled a ${diceValue}`;
    subText = diceValue === 6 ? "No moves available..." : "Need a 6 to start! Skipping...";
    statusColor = "text-red-500";
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg text-center border border-gray-100 h-64 flex flex-col justify-center">
      <h3 className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-4">Game Status</h3>
      
      {/* DICE CONTAINER */}
      <div 
        className={`
          w-24 h-24 mx-auto mb-4 flex items-center justify-center text-5xl rounded-xl transition-all duration-300
          ${isMyTurn && !diceValue ? 'cursor-pointer bg-purple-100 hover:bg-purple-200 shadow-md ring-4 ring-purple-200 animate-pulse' : 'bg-gray-100'}
        `}
        onClick={() => {
           if (isMyTurn && diceValue === null) onRollDice();
        }}
      >
        {diceValue ? (
            <span className={`text-gray-800 ${!canMove ? 'opacity-50' : ''}`}>
              {['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue - 1]}
            </span>
        ) : (
            <span className="opacity-50">🎲</span>
        )}
      </div>

      <div className="space-y-1">
        <h2 className={`text-xl font-bold ${statusColor}`}>{statusText}</h2>
        <p className="text-sm text-gray-500 font-medium">
          {subText}
        </p>
      </div>
      
      {/* Visual Progress Bar for Auto-Skip */}
      {isMyTurn && diceValue !== null && !canMove && (
         <div className="w-full bg-gray-200 h-1 mt-4 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full w-full animate-shrink"></div>
         </div>
      )}
    </div>
  );
};

export default GameControls;