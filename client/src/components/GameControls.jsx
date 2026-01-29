import React from 'react';

const GameControls = ({ isMyTurn, diceValue, onRollDice, currentPlayerName }) => {
  return (
    <div className="dice-box">
      <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#666' }}>
        {isMyTurn ? "Your Turn!" : `${currentPlayerName}'s Turn`}
      </h3>

      <div 
        className={`dice ${isMyTurn && !diceValue ? 'rolling-anim' : ''}`}
        onClick={() => isMyTurn && !diceValue && onRollDice()}
        style={{ 
          cursor: isMyTurn && !diceValue ? 'pointer' : 'not-allowed',
          opacity: isMyTurn ? 1 : 0.5 
        }}
      >
        {/* Render Dice Face */}
        {diceValue ? (
          <span>{['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceValue - 1]}</span>
        ) : (
          <span>🎲</span>
        )}
      </div>
      
      {isMyTurn && !diceValue && <p style={{fontSize: '0.8rem'}}>Click to Roll</p>}
      {diceValue && <p style={{fontSize: '0.8rem'}}>Move a piece</p>}
    </div>
  );
};

export default GameControls;