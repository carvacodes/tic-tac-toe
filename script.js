/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// Game Control ////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

// main game variables
let gameControl = {
  board: '---------', // will be used to keep track of the game state, instead of the array elements
  win: false,   // whether the current board state matches a win condition
  winConditions: new RegExp(/^xxx|ooo.{6}$|^...xxx|ooo...$|^.{6}xxx|ooo$|^(x|o)..\1..\1..$|^.(x|o)..\2..\2.$|^..(x|o)..\3..\3$|^(x|o)...\4...\4$|^..(x|o).\5.\5..$/), // all the potential board states that constitute a win
  drawConditions: new RegExp(/[xo]{9}/), // the game draws when the board string is full
  selectingGame: true,  // for detecting whether the game is started or if its options are still being selected
  numPlayers: 1,    // number of players, 1 or 2
  playerTurn: 0,    // which player's turn it is currently
  startingPlayer: 0,  // used to reset the player appropriately when the game is reset
  players: [
    {
      name: 'Player 1',
      symbol: 'x'
    },
    {
      name: 'Computer',
      symbol: 'o'
    }
  ]
}

///////////////////////////////////////////////////////////////////////////
/////////////////////////////////// DOM ///////////////////////////////////
///////////////////////////////////////////////////////////////////////////

// DOM elements
let els = {
  menuButton: document.getElementById('menu-button'),
  restartButton: document.getElementById('restart-button'),
  msg: document.getElementById('msg-div'),
  error: document.getElementById('error-div'),
  players: document.getElementById('players'),
  startingPlayer: document.getElementById('starting-player'),
  player1Name: document.getElementById('player1-name'),
  player2Name: document.getElementById('player2-name'),
  player1Symbol: document.getElementById('player1-symbol'),
  player2Symbol: document.getElementById('player2-symbol'),
  player2Title: document.getElementById('player2-title'),
  start: document.getElementById('start'),
  gameOptions: document.getElementById('game-options'),
  gameBoard: document.getElementById('game-board'),
  cells: document.getElementsByClassName('game-cell')
}

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// Listeners ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

// Listen for changes to the players selection, and update the name fields as necessary
els.players.addEventListener('change', function(){
  let n = els.players.value == 2 ? 'Player 2' : 'Computer'
  els.player2Title.textContent = n;
  els.player2Name.value = n;
});

// Before starting a game, run validation
els.start.addEventListener('click', function(e){
  let self = this;
  if (window.getComputedStyle(self).opacity == 0) {
    // don't allow any interaction or event bubbling with hidden elements
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  // don't allow matching symbols or empty names
  if (els.player1Symbol.value == els.player2Symbol.value) {
    displayError('Player symbols cannot match', 1000);
    return false;
  } else if (els.player1Symbol === '' || els.player2Symbol === '') {
    displayError('Both players must have a symbol', 1000);
    return false;
  } else if (els.player1Name.value === '' || els.player2Name.value === '') {
    displayError('Both players must have a name', 1000);
    return false;
  } else {  // validation successful; initialize the game!
    initializeGame();
    fadeOut(els.gameOptions, function(){
      fadeIn(els.gameBoard);
      fadeIn(els.menuButton);
      fadeIn(els.restartButton);
    });
  }
})

// Listen for clicks on the restart button
els.restartButton.addEventListener('click', function(e){
  let self = this;
  // don't allow any interaction or event bubbling with hidden elements
  if (window.getComputedStyle(self).opacity == 0) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  // fade out the game board and reset it, then fade it back in
  fadeOut(els.gameBoard, function(){
    resetBoard();
    fadeIn(els.gameBoard);
  });
})

// Listen for clicks on the menu button
els.menuButton.addEventListener('click', function(e){
  let self = this;
  // don't allow any interaction or event bubbling with hidden elements
  if (window.getComputedStyle(self).opacity == 0) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  if (confirm('Back to the main menu?')) {  // on user confirm, fade out game controls, and fade in the selection screen
    fadeOut(els.menuButton);                // removed the resetBoard function from here, since it will be
    fadeOut(els.restartButton);             // reset anyway when the game begins again
    fadeOut(els.gameBoard, function(){
      fadeIn(els.gameOptions);
      gameControl.selectingGame = true;
      gameControl.win = false;
    });
  }
})

// Main game board interface listener
window.addEventListener('click', function(e){
  // no need for special click functionality if currently selecting a game, in the win state, or during computer's turn
  if (gameControl.selectingGame || gameControl.win || (gameControl.numPlayers === 1 && gameControl.playerTurn === 1)) {
    return true;
  } else {
    // if the click target is a game cell
    if (e.target.className == 'game-cell') {
      // need c for an indexOf operation, to replace a gameControl.board character
      let c = Array.prototype.slice.call(els.cells);
      // if the target cell is empty, it's a valid move; allow it
      if (e.target.textContent === '') {
        // set the target cell's text content to the player's symbol
        e.target.textContent = gameControl.players[gameControl.playerTurn].symbol;
        // update the game board string with the current player's default value
        if (gameControl.playerTurn == 0) {
          gameControl.board = replaceStringIndex(gameControl.board, c.indexOf(e.target), 'x');
        } else {
          gameControl.board = replaceStringIndex(gameControl.board, c.indexOf(e.target), 'o');
        }
        // check win and draw conditions; if none, switch turns
        testBoard();
      }
    }
  }
});

/////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// Functions ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

// Display a message for a given time (fade in and fade out)
function displayMessage(msg, timeout) {
  let t = timeout || 3000;
  els.msg.textContent = msg;
  fadeIn(els.msg, function(){
    window.setTimeout(function(){
      fadeOut(els.msg);
    }, t)
  });
}

// Show an error (fade in and fade out)
function displayError(msg, timeout) {
  let t = timeout || 3000;
  els.error.textContent = msg;
  fadeIn(els.error, function(){
    window.setTimeout(function(){
      fadeOut(els.error);
    }, t)
  });
}

// Replace one character in a string; used to update the gameControl.board string
function replaceStringIndex(str, ind, char) {
  return (str.split('').map((el, i)=>{
    if (i === ind) { return char; }
    return el;
  }).join(''));
}

// Fade out a given element, then execute a callback if one was provided
function fadeOut(el, callback, callbackThis) {
  // set the opacity to the current opacity if the opacity value is not ''
  el.style.opacity = el.style.opacity || 1;
  // still need fading? set a timeout for recursion
  if (el.style.opacity > 0) {
    window.setTimeout(function(){
      el.style.opacity -= 0.1;
      fadeOut(el, callback, callbackThis);
    }, 10);
  }
  else {
    // otherwise remove the element from DOM flow
    el.style.display = 'none';
    // if a callback function was specified, use it
    if (callback) { callback(callbackThis); }
  }
}

// Fade in a given element, then execute a callback if one was provided
function fadeIn(el, callback, callbackThis) {
  // if the element is hidden, re-include it in the document flow
  if (el.style.display === '' || el.style.display == 'none') {
    el.style.display = 'initial';
  }
  if (el.style.opacity === '') {  // if the opacity value is empty, set it to 0
    el.style.opacity = 0;
  }
  if (Number.parseFloat(el.style.opacity) < 1) {  // remember to parse the opacity value!!
    el.style.opacity = Number.parseFloat(el.style.opacity) + 0.1;
    window.setTimeout(function(){
      fadeIn(el, callback, callbackThis);
    }, 10);
  }
  else {
    if (callback) { callback(callbackThis); }
  }
}

// Game control functions
function nextTurn(init) {
  // if on the first turn of a game vs computer and computer goes first, a call to nextTurn needs to be made to initiate the game, but the turn shouldn't be swapped
  // if this is not the first turn, swap turns as usual
  if (!init) { gameControl.playerTurn = gameControl.playerTurn == 0 ? 1 : 0; }
  
  // computer AI
  if (gameControl.playerTurn == 1 && gameControl.numPlayers == 1) {
    window.setTimeout(function(){   // delay the computer's action slightly
      let nextMove;
      
      // to check the next move, the board is divided into "triads" of 3 rows, 3 cols, and 2 diagonals
      // these are the triad states where a win or a lose is imminent (in regular expression format)
      let winConditions = new RegExp(/(-oo)|(o-o)|(oo-)/);
      let blockConditions = new RegExp(/(-xx)|(x-x)|(xx-)/);
            
      // check for imminent wins or losses
      nextMove = checkMoves(winConditions) || checkMoves(blockConditions);
      // if none, check for the middle square, or pick a random empty square
      if (nextMove == undefined) {
        // always choose the middle square if it is available
        if (els.cells[4].textContent == '') {
          nextMove = 4;
        } else {
          while (nextMove == undefined) {   // for now, pick a random empty square; may add more complex logic later
            nextMove = Math.floor(Math.random() * 9); // pick a random number
            if (els.cells[nextMove].textContent !== '') { // if that cell is occupied, reset nextMove and loop again
              nextMove = undefined;
            }
          }
        }
      }
      // test to make sure it's your turn, computer!!
      // (fixes a bug where restarting a game during the computer's "thinking" period would allow it to move twice in the new game)
      if (gameControl.playerTurn === 1) {
        els.cells[nextMove].textContent = gameControl.players[1].symbol;  // place the computer's symbol on the board
        gameControl.board = replaceStringIndex(gameControl.board, nextMove, 'o'); // update the internal game board
        testBoard();  // test for wins/draws
      }
    }, 1000);
  }
}
function testWin() {
  return gameControl.winConditions.test(gameControl.board);
}
function testDraw() {
  return gameControl.drawConditions.test(gameControl.board);
}
function checkMoves(regexp) {
  // now for the logic; always go for wins immediately. next, block imminent losses. otherwise, pick a random empty square (may implement more complex logic later)
  // the logic is commented once, but is the same for checking all rows, columns and diagonals for both win moves and blocks
  let b = gameControl.board;  // easier to reference the gameBoard by b
  let rows = [          // get each row triad
    b[0] + b[1] + b[2],
    b[3] + b[4] + b[5],
    b[6] + b[7] + b[8]
  ];
  let cols = [          // get each column triad
    b[0] + b[3] + b[6],
    b[1] + b[4] + b[7],
    b[2] + b[5] + b[8]
  ];
  let diags = [         // get both diagonal triads
    b[0] + b[4] + b[8],
    b[2] + b[4] + b[6]
  ]
  let checks = [rows, cols, diags]; // hold them here

  for (let triadGroup = 0; triadGroup < checks.length; triadGroup++) {
    for (let triad = 0; triad < checks[triadGroup].length; triad++) {
      let cond = regexp.exec(checks[triadGroup][triad]);
      if (cond) {
        cond.shift();
        cond = cond.filter((el, i)=>{return el !== undefined;})[0];
        let emptySquareIndex = cond.indexOf('-');
        if (triadGroup === 0) {   // checking rows
          return ((triad * 3) + emptySquareIndex);
        } else if (triadGroup === 1) { // checking columns
          return ((emptySquareIndex * 3) + triad);
        } else {  // checking top left to bottom right diagonal
          if (triad === 0) {
            return (emptySquareIndex * 4);
          } else {  // checking top right to bottom left diagonal
            return ((emptySquareIndex + 1) * 2);
          }
        }
      }
    }
  }
  return undefined;
}
// sets the game environment when coming from the menu/selection screen
function initializeGame() {
  gameControl.selectingGame = false;
  gameControl.numPlayers = Number.parseInt(els.players.value);  // be sure to parse the players element string into a number!!
  gameControl.players[0].name = els.player1Name.value;
  gameControl.players[0].symbol = els.player1Symbol.value;
  gameControl.players[1].name = els.player2Name.value;
  gameControl.players[1].symbol = els.player2Symbol.value;
  gameControl.startingPlayer = Number.parseInt(els.startingPlayer.value); // same with the starting player value
  testFontSize();
  resetBoard();
}

// Resets the game board and the players
function resetBoard (){
  // empty out the game board
  for (let i = 0; i < els.cells.length; i++) {
    els.cells[i].textContent = '';
  }
  gameControl.board = '---------';      // reset the internal game board
  gameControl.playerTurn = gameControl.startingPlayer;  // reset to the starting player's turn
  if (gameControl.numPlayers === 1 && gameControl.startingPlayer === 1) { nextTurn(true); } // if playing against the computer and the computer goes first, automatically start its turn on game start
  gameControl.win = false;  // set the win state to false
}

// tests the current internal game state for wins or draws, and goes to the next turn if none
function testBoard() {
  let currentPlayer = gameControl.players[gameControl.playerTurn];
  if (testWin()) {
    displayMessage('Winner! Congratulations ' + currentPlayer.name + '!', 3000);
    currentPlayer.wins++;
    gameControl.win = true;
  } else if (testDraw()) {
    displayMessage('Draw!');
  } else {
    nextTurn();
  }
}

// automatically sets the maximum font size when starting the game
// allows player symbols that would normally be larger than the game cells to fit well
function testFontSize() {
  // parse the current cell font size as an integer
  let currentFontSize = Number.parseInt(window.getComputedStyle(els.cells[0]).fontSize.slice(0, -2));
  let maxFontSize = Number.parseInt(currentFontSize);
  // create a dummy element to test the font size
  let p = document.createElement('p');
  p.style.height = 'auto';
  p.style.width = 'auto';
  p.style.visibility = 'hidden';
  p.style.position = 'absolute';
  p.style.fontSize = currentFontSize + 'px';
  document.body.appendChild(p);
  // test each player symbol to see if the font size needs to be adjusted
  for (let i = 0; i < 2; i++) {
    p.textContent = gameControl.players[i].symbol;
    let potentialSize = currentFontSize * (103 / Number.parseFloat(window.getComputedStyle(p).width.slice(0, -2)));
    maxFontSize = Math.min(potentialSize, maxFontSize);
  }
  // set all element font sizes to that font size
  for (let i = 0; i < els.cells.length; i++) {
    els.cells[i].style.fontSize = maxFontSize + 'px';
  }
  // remove the dummy element
  document.body.removeChild(p);
}