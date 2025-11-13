// --- VARIABLES GLOBALES Y CONSTANTES ---
let questions = {}; // Se llenará con la carga del JSON

// Costos de Monedas
const REROLL_COST = 2;
const REVEAL_COST = 5;
const PACK_PRICE = 10;
const SINGLE_CARD_PRICE = 7;
const TRADE_COST_POINTS = 50;

const defaultConfig = {
  game_title: "English Card Quest",
  instructions_text: "Selecciona cartas del tablero para responder. Gana monedas por aciertos y úsalas sabiamente."
};

let gameMode = 'single';
let players = [];
let currentPlayerIndex = 0;
let botDifficulty = 'medium';

// El estado de la tienda, para que no cambie si se sale y entra
let shopStock = {
  card1: null,
  card2: null
};

let gameState = {
  currentRound: 1,
  maxRounds: 10,
  totalPoints: 0,
  totalCoins: 0, // Moneda
  correctAnswers: 0,
  incorrectAnswers: 0,
  boardCards: [],
  playerCards: [],
  selectedCard: null,
  waitingForBoardSelection: false,
  peekingCardIndex: null,
  magnifyRevealedCards: [],
  cardsPlayedThisTurn: 0,
  doublePointsActive: false,
  megaRewardActive: false,
  currentQuestionIndex: null 
};

// --- CARGA INICIAL Y EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
  fetch('questions.json')
    .then(response => {
      if (!response.ok) throw new Error('No se pudo cargar questions.json');
      return response.json();
    })
    .then(data => {
      questions = data;
      // FIX: Ahora que las preguntas están, ATACAMOS los listeners.
      initializeEventListeners(); 
    })
    .catch(error => {
      console.error("Error fatal: No se pudo cargar 'questions.json'.", error);
      alert("Error: No se pudo cargar el archivo 'questions.json'. Asegúrate de que el archivo existe en la misma carpeta.");
    });
});

function initializeEventListeners() {
  // Modo
  document.getElementById('singlePlayerBtn').addEventListener('click', startSinglePlayer);
  document.getElementById('challengeBtn').addEventListener('click', showChallengeConfig);
  document.getElementById('multiPlayerBtn').addEventListener('click', showMultiplayerConfig);
  // ELIMINADO: 'goToShopBtn'

  // Configuración
  document.getElementById('backToModeBtn').addEventListener('click', () => showScreen('mode'));
  document.getElementById('startGameBtn').addEventListener('click', startConfiguredGame);

  // Juego
  document.getElementById('endTurnBtn').addEventListener('click', endTurn);
  document.getElementById('cancelActionBtn').addEventListener('click', cancelAction);
  document.getElementById('exitToMenuBtn').addEventListener('click', restartGame);

  // Fin de Juego
  document.getElementById('restartBtn').addEventListener('click', restartGame);

  // Tienda
  document.getElementById('backToMenuShopBtn').addEventListener('click', () => showScreen('mode'));
  document.getElementById('continueToNextRoundBtn').addEventListener('click', startNextRound); // Botón para avanzar
  document.getElementById('buyPackBtn').addEventListener('click', buyCardPack);

  // Sobre Gratis
  document.getElementById('openFreePack').addEventListener('click', openFreePack);
  document.getElementById('continueFromPackBtn').addEventListener('click', () => {
    document.getElementById('freePackModal').classList.remove('active');
    initializeGame(false); // Inicia el juego DE VERDAD
  });

  // Checkboxes de Bot
  document.getElementById('player2Bot').addEventListener('change', (e) => toggleBotInput(e.target, 'player2Name', 'Nombre del Jugador 2'));
  document.getElementById('player3Bot').addEventListener('change', (e) => toggleBotInput(e.target, 'player3Name', 'Nombre del Jugador 3'));
  document.getElementById('player4Bot').addEventListener('change', (e) => toggleBotInput(e.target, 'player4Name', 'Nombre del Jugador 4'));
}

function toggleBotInput(checkbox, inputId, placeholder) {
  const input = document.getElementById(inputId);
  input.disabled = checkbox.checked;
  if (checkbox.checked) {
    input.value = '';
    input.placeholder = 'Bot activado';
  } else {
    input.placeholder = placeholder;
  }
}

// --- LÓGICA DE NAVEGACIÓN DE PANTALLAS ---

function showScreen(screenName) {
  // Ocultar todas las pantallas
  document.getElementById('modeSelection').style.display = 'none';
  document.getElementById('playerNamesScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'none';
  document.getElementById('shopScreen').style.display = 'none';

  const screen = document.getElementById(screenName);
  if (screen) {
    screen.style.display = (screenName === 'shopScreen') ? 'flex' : 'block';
  }
}

// --- LÓGICA DE CONFIGURACIÓN DEL JUEGO ---

function startSinglePlayer() {
  gameMode = 'single';
  players = [];
  gameState.maxRounds = 10;
  // REGLA: Mostrar sobre gratis primero
  showFreePackModal();
}

function showFreePackModal() {
  const modal = document.getElementById('freePackModal');
  modal.classList.add('active');
  // Resetear el modal
  document.getElementById('openFreePack').style.display = 'block';
  document.getElementById('openFreePack').style.animation = 'pulsePack 1.5s infinite';
  document.getElementById('revealedCard').style.display = 'none';
  document.getElementById('continueFromPackBtn').style.display = 'none';
}

function openFreePack() {
  const packElement = document.getElementById('openFreePack');
  const revealedCardElement = document.getElementById('revealedCard');
  
  // 1. Generar la carta (true = Básico, sin "Intercambio")
  const newCard = generateRandomCard(true); 
  gameState.playerCards = [newCard]; // El mazo ahora tiene esta carta
  
  // 2. Mostrar la carta en el modal
  revealedCardElement.innerHTML = renderCardHTML(newCard);
  if (newCard.type === 'wildcard') {
    revealedCardElement.classList.add('joker-card');
  }
  
  // 3. Animación
  packElement.style.animation = 'none';
  packElement.style.display = 'none';
  revealedCardElement.style.display = 'inline-block';
  
  // 4. Mostrar botón de continuar
  document.getElementById('continueFromPackBtn').style.display = 'inline-block';
}


function showChallengeConfig() {
  gameMode = 'challenge';
  document.getElementById('configTitle').textContent = 'Modo Desafío (1 vs 1)';
  document.getElementById('player3Config').style.display = 'none';
  document.getElementById('player4Config').style.display = 'none';
  document.getElementById('roundsConfig').style.display = 'block';
  showScreen('names');
}

function showMultiplayerConfig() {
  gameMode = 'multiplayer';
  document.getElementById('configTitle').textContent = 'Modo Multijugador';
  document.getElementById('player3Config').style.display = 'block';
  document.getElementById('player4Config').style.display = 'block';
  document.getElementById('roundsConfig').style.display = 'block';
  showScreen('names');
}

function startConfiguredGame() {
  const maxRounds = parseInt(document.getElementById('maxRounds').value) || 10;
  gameState.maxRounds = Math.min(Math.max(maxRounds, 1), 40);
  botDifficulty = document.getElementById('botDifficulty').value;

  const createPlayer = (name, isBot, defaultName) => ({
    name: isBot ? `🤖 ${defaultName.replace('Jugador', 'Bot')}` : (name.trim() || defaultName),
    points: 0, correct: 0, incorrect: 0, isBot: isBot,
    cards: generateInitialCards(), // Todos empiezan con un mazo básico
    boardCards: [], peekingCards: []
  });

  if (gameMode === 'challenge') {
    players = [
      createPlayer(document.getElementById('player1Name').value, false, 'Jugador 1'),
      createPlayer(document.getElementById('player2Name').value, document.getElementById('player2Bot').checked, 'Jugador 2')
    ];
  } else if (gameMode === 'multiplayer') {
    players = [
      createPlayer(document.getElementById('player1Name').value, false, 'Jugador 1'),
      createPlayer(document.getElementById('player2Name').value, document.getElementById('player2Bot').checked, 'Jugador 2'),
      createPlayer(document.getElementById('player3Name').value, document.getElementById('player3Bot').checked, 'Jugador 3'),
      createPlayer(document.getElementById('player4Name').value, document.getElementById('player4Bot').checked, 'Jugador 4')
    ];
  }
  
  currentPlayerIndex = 0;
  // Iniciar juego (sin sobre gratis para multi)
  initializeGame(false); 

  if (getCurrentPlayer().isBot) {
    setTimeout(playBotTurn, 1500);
  }
}

// --- LÓGICA DE TURNOS Y JUGADORES (Bot) ---
function getCurrentPlayer() {
  if (gameMode !== 'single') {
    return players[currentPlayerIndex];
  }
  return null;
}
function nextPlayer() {
  if (gameMode !== 'single') {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateCurrentPlayerDisplay();
    if (getCurrentPlayer().isBot) {
      setTimeout(playBotTurn, 1500);
    }
  }
}
function playBotTurn() { /* ... Lógica del Bot ... */ }
function updateCurrentPlayerDisplay() { /* ... Lógica de actualizar UI ... */ }
function saveCurrentPlayerState() { /* ... Lógica de guardar estado ... */ }

// --- LÓGICA PRINCIPAL DEL JUEGO ---

function initializeGame(showFreePack = true) {
  // REGLA: Sobre gratis al inicio de Un Jugador
  if (showFreePack && gameMode === 'single') {
    showFreePackModal();
    return; // No continuar hasta que el modal se cierre
  }
  
  showScreen('game');

  gameState.currentRound = 1;
  gameState.totalPoints = 0;
  gameState.correctAnswers = 0;
  gameState.incorrectAnswers = 0;
  gameState.boardCards = [];
  gameState.selectedCard = null;
  gameState.waitingForBoardSelection = false;
  gameState.peekingCardIndex = null;
  gameState.magnifyRevealedCards = [];
  gameState.cardsPlayedThisTurn = 0;
  gameState.doublePointsActive = false;
  gameState.megaRewardActive = false;

  document.getElementById('gameTitleInGame').textContent = defaultConfig.game_title;
  document.getElementById('instructions').textContent = defaultConfig.instructions_text;

  if (gameMode === 'single') {
    document.getElementById('currentPlayerTurn').style.display = 'none';
    gameState.maxRounds = 10;
    // El mazo ya tiene 1 carta del sobre gratis
    if (gameState.playerCards.length === 0) {
      gameState.playerCards = generateInitialCards();
    }
    gameState.totalCoins = 5; // Regla: 5 monedas al inicio
  } else {
    document.getElementById('currentPlayerTurn').style.display = 'block';
    gameState.totalCoins = 5; // Regla: 5 monedas al inicio (compartidas)
    // Cada jugador en multi recibe un mazo inicial
    players.forEach(p => p.cards = generateInitialCards());
    updateCurrentPlayerDisplay();
  }

  initializeBoard();

  if (gameMode !== 'single') {
    getCurrentPlayer().boardCards = [...gameState.boardCards];
  }

  renderPlayerDeck();
  updateStats();
}

function generateInitialCards() {
  // Damos un mazo básico para empezar
  return [
    generateRandomCard(true), // true = Básico, sin "Intercambio"
    generateRandomCard(true)
  ];
}

function initializeBoard() {
  gameState.boardCards = [];
  const difficulties = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard'];
  const shuffledDifficulties = difficulties.sort(() => Math.random() - 0.5);

  for (let i = 0; i < 8; i++) {
    const difficulty = shuffledDifficulties[i];
    const questionPool = questions[difficulty];
    const randomQuestion = questionPool[Math.floor(Math.random() * questionPool.length)];

    gameState.boardCards.push({
      difficulty: difficulty,
      question: randomQuestion,
      removed: false
    });
  }
  renderBoard();
}

// --- LÓGICA DE RENDERIZADO (UI) ---

function renderBoard() {
  const boardGrid = document.getElementById('boardGrid');
  boardGrid.innerHTML = '';
  const player = getCurrentPlayer();
  let revealedIndices = [];

  if (gameMode !== 'single') {
    revealedIndices = player ? player.peekingCards : [];
  } else {
    // Lupa (Magnify) ahora resetea cada ronda
    if (gameState.peekingCardIndex !== null) revealedIndices.push(gameState.peekingCardIndex);
    if (gameState.magnifyRevealedCards) revealedIndices.push(...gameState.magnifyRevealedCards);
  }

  gameState.boardCards.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'board-card';

    if (card.removed) {
      cardEl.classList.add('removed');
      cardEl.innerHTML = '❌';
    } else {
      cardEl.innerHTML = ''; // FIX: No poner emoji
      
      const isPeeking = revealedIndices.includes(index);
      if (isPeeking) {
        cardEl.classList.add('peeking');
        const badge = document.createElement('div');
        badge.className = `difficulty-badge difficulty-${card.difficulty}`;
        badge.textContent = card.difficulty === 'easy' ? 'Fácil' : card.difficulty === 'medium' ? 'Medio' : 'Difícil';
        cardEl.appendChild(badge);
      }
      cardEl.addEventListener('click', () => handleBoardCardClick(index));
    }
    boardGrid.appendChild(cardEl);
  });
}

function renderCardHTML(card) {
  if (card.type === 'wildcard') { // JOKER
    return `
      <img src="images/joker_card.png" alt="Joker" class="joker-image"/>
      <div class="card-name">${card.name}</div>
      <div class="card-description">${card.description}</div>
    `;
  } else {
    return `
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-description">${card.description}</div>
    `;
  }
}

function renderPlayerDeck() {
  const playerDeck = document.getElementById('playerDeck');
  playerDeck.innerHTML = '';

  gameState.playerCards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'player-card';

    if (gameState.selectedCard && gameState.selectedCard.id === card.id) {
      cardEl.classList.add('selected');
    }
    if (card.type === 'wildcard') {
      cardEl.classList.add('joker-card');
    }

    cardEl.innerHTML = renderCardHTML(card);
    cardEl.addEventListener('click', (e) => handlePlayerCardClick(card, e.currentTarget));
    playerDeck.appendChild(cardEl);
  });
}

function generateRandomCard(basicOnly = false) {
  const baseCardTypes = [
    { name: "Eliminar", icon: "🗑️", description: "Elimina una carta del tablero", type: "remove" },
    { name: "Ver Carta", icon: "👁️", description: "Ve la pregunta de una carta", type: "peek" },
    { name: "Bonus", icon: "⭐", description: "Gana 50 puntos extra", type: "bonus" },
    { name: "Joker", icon: "🃏", description: "Responde automáticamente correcto", type: "wildcard" },
    { name: "Cambiar", icon: "🔄", description: "Cambia la pregunta o baja dificultad", type: "change" },
    { name: "Lupa", icon: "🔍", description: "Revela 4 cartas aleatorias", type: "magnify" },
    { name: "Turno Extra", icon: "⚡", description: "Juega una carta adicional", type: "extraTurn" },
    { name: "Mega Recompensa", icon: "🎁", description: "Gana 4 cartas al responder bien", type: "megaReward" },
    { name: "Duplicador", icon: "💎", description: "Duplica puntos de la siguiente pregunta", type: "doublePoints" },
    { name: "Respuesta", icon: "💡", description: "Muestra la respuesta correcta", type: "answer" }
  ];
  
  // REGLA: Intercambio es una carta especial
  const tradeCard = { name: "Intercambio", icon: "💰", description: `-${TRADE_COST_POINTS} Puntos por 2 cartas y 5 monedas`, type: "trade" };

  let cardTypes = [...baseCardTypes];
  
  if (!basicOnly && !gameState.playerCards.some(card => card.type === 'trade')) {
    cardTypes.push(tradeCard);
  }

  const selectedCard = cardTypes[Math.floor(Math.random() * cardTypes.length)];
  return { ...selectedCard, id: Date.now() + Math.random() };
}

// --- LÓGICA DE INTERACCIÓN ---

function handlePlayerCardClick(card, cardElement) {
  // REGLA: Doble clic cancela
  if (gameState.waitingForBoardSelection && gameState.selectedCard && gameState.selectedCard.id === card.id) {
    cancelAction();
    return;
  }

  // --- LÍGICA DE CONSUMIBLES ---
  const consumables = ['bonus', 'magnify', 'doublePoints', 'megaReward', 'extraTurn', 'trade'];
  if (consumables.includes(card.type)) {
    if (useConsumable(card, cardElement)) {
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== card.id);
      saveCurrentPlayerState();
      renderPlayerDeck();
    }
    return;
  }

  // --- LÓGICA DE CARTAS DE OBJETIVO ---
  // ('remove', 'peek', 'wildcard', 'change', 'answer')
  gameState.selectedCard = card;
  gameState.waitingForBoardSelection = true;
  document.getElementById('cancelActionBtn').style.display = 'block';
  renderPlayerDeck();
  showToast(`Selecciona una carta del tablero para ${card.name.toLowerCase()}`);
}

// Nueva función para manejar consumibles
function useConsumable(card, cardElement) {
  createCardUseEffect(cardElement);

  switch (card.type) {
    case 'bonus':
      gameState.totalPoints += 50;
      updateStats();
      showToast('¡+50 puntos! 🌟');
      break;
    
    case 'magnify': // Lupa
      const hiddenCards = gameState.boardCards
        .map((c, i) => ({ c, i }))
        .filter(item => !item.c.removed && !gameState.magnifyRevealedCards.includes(item.i));
      
      const cardsToReveal = Math.min(4, hiddenCards.length);
      if (cardsToReveal === 0) {
        showToast('⚠️ No hay cartas ocultas para revelar');
        return false; // No se usó
      }
      
      for (let i = 0; i < cardsToReveal; i++) {
        const randomIndex = Math.floor(Math.random() * hiddenCards.length);
        const cardToReveal = hiddenCards.splice(randomIndex, 1)[0];
        gameState.magnifyRevealedCards.push(cardToReveal.i);
      }
      renderBoard();
      showToast(`¡Lupa usada! 🔍 Reveladas ${cardsToReveal} cartas (dura 1 ronda)`);
      break;

    case 'doublePoints':
      gameState.doublePointsActive = true;
      showToast('¡Duplicador activado! 💎 (dura 1 intento)');
      break;
      
    case 'megaReward':
      gameState.megaRewardActive = true;
      showToast('¡Mega Recompensa activada! 🎁 (dura 1 intento)');
      break;
      
    case 'extraTurn':
      gameState.cardsPlayedThisTurn = Math.max(0, gameState.cardsPlayedThisTurn - 1);
      updateStats();
      showToast('¡Turno Extra! Puedes jugar una carta adicional ⚡');
      break;
      
    case 'trade': // Intercambio
      if (gameState.totalPoints < TRADE_COST_POINTS) {
        showToast(`⚠️ Necesitas ${TRADE_COST_POINTS} Puntos para este Intercambio`);
        return false;
      }
      gameState.totalPoints -= TRADE_COST_POINTS;
      gameState.totalCoins += 5;
      const newCard1 = generateRandomCard();
      const newCard2 = generateRandomCard();
      gameState.playerCards.push(newCard1, newCard2);
      showToast(`¡Intercambio! -${TRADE_COST_POINTS} Puntos, +5 Monedas, +2 Cartas 💰`);
      updateStats();
      break;
  }
  
  return true; // La carta se usó con éxito
}


function handleBoardCardClick(index) {
  const card = gameState.boardCards[index];
  if (card.removed) return;

  if (gameState.cardsPlayedThisTurn >= 2 && gameMode === 'single') {
    showToast('⚠️ Ya jugaste 2 cartas este turno. Presiona "Terminar Turno"');
    return;
  }
  
  gameState.currentQuestionIndex = index;

  if (gameState.waitingForBoardSelection && gameState.selectedCard) {
    // --- ACCIÓN DE CARTA ESPECIAL CON OBJETIVO (BUG FIX) ---
    const specialCard = gameState.selectedCard;
    let cardUsed = true;

    switch (specialCard.type) {
      case 'remove':
        card.removed = true;
        showToast('Carta eliminada del tablero! 🗑️');
        renderBoard();
        break;
      case 'peek':
        if (!gameState.magnifyRevealedCards.includes(index)) {
            gameState.magnifyRevealedCards.push(index); // Añadir a la lista de reveladas
        }
        showToast('¡Puedes ver esta carta! 👁️ (dura 1 ronda)');
        renderBoard();
        break;
      case 'wildcard': // JOKER
        const points = card.difficulty === 'easy' ? 10 : card.difficulty === 'medium' ? 20 : 30;
        gameState.totalPoints += points;
        gameState.correctAnswers++;
        gameState.totalCoins++; // +1 Moneda por Joker
        card.removed = true;
        gameState.cardsPlayedThisTurn++;
        showToast(`¡Joker! +${points} puntos y +1 moneda 🃏`);
        createSuccessParticles();
        renderBoard();
        break;
      case 'change':
        const currentDifficulty = card.difficulty;
        let newDifficulty = currentDifficulty;
        if (currentDifficulty === 'hard') newDifficulty = 'medium';
        else if (currentDifficulty === 'medium') newDifficulty = 'easy';
        
        const questionPool = questions[newDifficulty];
        card.question = questionPool[Math.floor(Math.random() * questionPool.length)];
        card.difficulty = newDifficulty;
        
        if (!gameState.magnifyRevealedCards.includes(index)) {
            gameState.magnifyRevealedCards.push(index);
        }
        showToast(`¡Carta cambiada a dificultad ${newDifficulty}! 🔄`);
        renderBoard();
        break;
      case 'answer':
        const correctAnswer = card.question.answers[card.question.correct];
        showToast(`💡 Respuesta: "${correctAnswer}"`);
        if (!gameState.magnifyRevealedCards.includes(index)) {
            gameState.magnifyRevealedCards.push(index);
        }
        renderBoard();
        break;
      default:
        cardUsed = false; // No era una carta de objetivo
    }

    if (cardUsed) {
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== specialCard.id);
      cancelAction();
      renderPlayerDeck();
      updateStats();
    }
    
  } else {
    // --- ABRIR PREGUNTA NORMAL ---
    showQuestion(card, index);
  }
}

function showQuestion(card, cardIndex) {
  const modal = document.getElementById('questionModal');
  const content = document.getElementById('questionContent');
  gameState.currentQuestionIndex = cardIndex;

  const difficultyText = card.difficulty === 'easy' ? 'Fácil' : card.difficulty === 'medium' ? 'Desafiante' : 'Difícil';
  const difficultyClass = `difficulty-${card.difficulty}`;

  content.innerHTML = `
    <div class="question-header">
      <div class="question-difficulty ${difficultyClass}">${difficultyText}</div>
      <button class="btn-icon" id="rerollQuestionBtn" title="Cambiar Pregunta (Costo: ${REROLL_COST} Monedas)">
        <i class="fa-solid fa-rotate-right"></i> ${REROLL_COST}
      </button>
    </div>
    <div class="question-text">${card.question.question}</div>
    <div class="answer-options" id="answerOptions"></div>
    <div class="question-helpers">
       <button class="btn-reveal" id="revealAnswerBtn">
         <i class="fa-solid fa-lightbulb"></i> Revelar Respuesta (Costo: ${REVEAL_COST} Monedas)
       </button>
    </div>
  `;

  const optionsContainer = document.getElementById('answerOptions');
  const shuffledAnswers = card.question.answers
      .map((answer, index) => ({ answer, originalIndex: index }))
      .sort(() => Math.random() - 0.5);

  shuffledAnswers.forEach(({ answer, originalIndex }) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = answer;
    btn.addEventListener('click', () => checkAnswer(originalIndex, card, cardIndex, btn));
    optionsContainer.appendChild(btn);
  });

  // Listeners y deshabilitar botones
  document.getElementById('rerollQuestionBtn').addEventListener('click', rerollQuestion);
  document.getElementById('revealAnswerBtn').addEventListener('click', revealAnswer);
  if (gameState.totalCoins < REROLL_COST) document.getElementById('rerollQuestionBtn').disabled = true;
  if (gameState.totalCoins < REVEAL_COST) document.getElementById('revealAnswerBtn').disabled = true;

  modal.classList.add('active');
}

function checkAnswer(selectedIndex, card, cardIndex, btnElement) {
  const isCorrect = selectedIndex === card.question.correct;
  const allButtons = document.querySelectorAll('.answer-btn');

  allButtons.forEach(btn => { btn.disabled = true; });
  document.getElementById('rerollQuestionBtn').disabled = true;
  document.getElementById('revealAnswerBtn').disabled = true;

  const correctButtonText = card.question.answers[card.question.correct];
  allButtons.forEach(btn => {
      if (btn.textContent === correctButtonText) btn.classList.add('correct');
  });

  if (!isCorrect) btnElement.classList.add('incorrect');

  const content = document.getElementById('questionContent');
  const resultDiv = document.createElement('div');
  resultDiv.className = `result-message ${isCorrect ? 'correct' : 'incorrect'}`;

  if (isCorrect) {
    let points = card.difficulty === 'easy' ? 10 : card.difficulty === 'medium' ? 20 : 30;
    if (gameState.doublePointsActive) points *= 2;
    
    // REGLA DE MONEDAS
    let coinsWon = 0;
    if (card.difficulty === 'easy') coinsWon = 1;
    else if (card.difficulty === 'medium') coinsWon = 2;
    else if (card.difficulty === 'hard') coinsWon = 3;
    
    gameState.totalPoints += points;
    gameState.correctAnswers++;
    gameState.totalCoins += coinsWon;

    resultDiv.textContent = `¡Correcto! +${points} puntos y +${coinsWon} Moneda(s) 🪙`;
    createSuccessParticles(btnElement);
    
    if (gameState.megaRewardActive) {
      for (let i = 0; i < 4; i++) gameState.playerCards.push(generateRandomCard());
      resultDiv.textContent += ' ¡Ganaste 4 cartas! 🎁';
    }
    
  } else {
    gameState.incorrectAnswers++;
    resultDiv.textContent = `¡Incorrecto! La respuesta era: "${correctButtonText}"`;
    createErrorParticles(btnElement);
  }
  
  gameState.doublePointsActive = false;
  gameState.megaRewardActive = false;
  saveCurrentPlayerState();
  
  content.appendChild(resultDiv);
  gameState.boardCards[cardIndex].removed = true;
  gameState.cardsPlayedThisTurn++;

  setTimeout(() => {
    document.getElementById('questionModal').classList.remove('active');
    updateStats();
    renderBoard();
    renderPlayerDeck();
    checkAutoEndTurn();
  }, 2500);
}

// --- NUEVAS FUNCIONES DE MONEDAS ---

function rerollQuestion() {
  if (gameState.totalCoins < REROLL_COST) {
    showToast(`⚠️ Necesitas ${REROLL_COST} monedas.`); return;
  }
  gameState.totalCoins -= REROLL_COST;
  updateStats();
  
  const cardIndex = gameState.currentQuestionIndex;
  const currentDifficulty = gameState.boardCards[cardIndex].difficulty;
  
  const questionPool = questions[currentDifficulty];
  const newQuestion = questionPool[Math.floor(Math.random() * questionPool.length)];
  
  gameState.boardCards[cardIndex].question = newQuestion;
  
  document.getElementById('questionModal').classList.remove('active');
  setTimeout(() => {
    showQuestion(gameState.boardCards[cardIndex], cardIndex);
    showToast("¡Pregunta cambiada!");
  }, 200);
}

function revealAnswer() {
  if (gameState.totalCoins < REVEAL_COST) {
    showToast(`⚠️ Necesitas ${REVEAL_COST} monedas.`); return;
  }
  gameState.totalCoins -= REVEAL_COST;
  updateStats();
  
  document.getElementById('revealAnswerBtn').disabled = true;
  document.getElementById('rerollQuestionBtn').disabled = true;

  const card = gameState.boardCards[gameState.currentQuestionIndex];
  const correctAnswerText = card.question.answers[card.question.correct];
  
  document.querySelectorAll('.answer-btn').forEach(btn => {
    if (btn.textContent === correctAnswerText) {
      btn.classList.add('revealed');
    }
  });
  
  showToast("¡Respuesta revelada!");
}

// --- LÓGICA DE TIENDA Y RONDAS ---

function showShop(isEndOfRound) {
  if (gameMode !== 'single') {
    showToast("La tienda solo está disponible en modo 'Un Jugador'.");
    return;
  }
  
  // Poblar la tienda
  shopStock.card1 = generateRandomCard(true);
  shopStock.card2 = generateRandomCard(true);
  
  const renderShopCard = (card, slotId) => {
    if (!card) return '<p>¡Vendido!</p>';
    return `
      <h3>Carta Individual</h3>
      <div class="player-card ${card.type === 'wildcard' ? 'joker-card' : ''}">
        ${renderCardHTML(card)}
      </div>
      <button class="btn btn-success buy-single-card" data-slot="${slotId}">
        Comprar (<i class="fa-solid fa-coins"></i> ${SINGLE_CARD_PRICE})
      </button>
    `;
  };
  
  document.getElementById('shopCard1').innerHTML = renderShopCard(shopStock.card1, 'card1');
  document.getElementById('shopCard2').innerHTML = renderShopCard(shopStock.card2, 'card2');

  // Añadir Listeners
  document.querySelectorAll('.buy-single-card').forEach(btn => {
    btn.onclick = (e) => buySingleCard(e.currentTarget);
  });
  
  if (isEndOfRound) {
    document.getElementById('shopTitle').textContent = "Tienda (Fin de Ronda)";
    document.getElementById('shopSubtitle').textContent = `Preparándote para la Ronda ${gameState.currentRound + 1}`;
    document.getElementById('backToMenuShopBtn').style.display = 'none';
    document.getElementById('continueToNextRoundBtn').style.display = 'block';
  } else {
    document.getElementById('shopTitle').textContent = "Tienda de Cartas";
    document.getElementById('shopSubtitle').textContent = "Usa tus monedas para comprar mejoras";
    document.getElementById('backToMenuShopBtn').style.display = 'block';
    document.getElementById('continueToNextRoundBtn').style.display = 'none';
  }
  
  document.getElementById('shopCoins').textContent = gameState.totalCoins;
  showScreen('shop');
}

function buyCardPack() {
  if (gameState.totalCoins < PACK_PRICE) {
    showToast("⚠️ ¡Monedas insuficientes!"); return;
  }
  gameState.totalCoins -= PACK_PRICE;
  
  const newCard = generateRandomCard();
  gameState.playerCards.push(newCard);
  showToast(`¡Compraste un sobre! Obtuviste: ${newCard.name}`);

  document.getElementById('shopCoins').textContent = gameState.totalCoins;
  updateStats();
  renderPlayerDeck();
}

function buySingleCard(buttonElement) {
  if (gameState.totalCoins < SINGLE_CARD_PRICE) {
    showToast("⚠️ ¡Monedas insuficientes!"); return;
  }
  
  const slotId = buttonElement.dataset.slot;
  const purchasedCard = shopStock[slotId];

  if (!purchasedCard) {
    showToast("¡Error! Esta carta ya fue vendida.");
    return;
  }
  
  gameState.totalCoins -= SINGLE_CARD_PRICE;
  purchasedCard.id = Date.now() + Math.random();
  gameState.playerCards.push(purchasedCard);
  showToast(`¡Compraste: ${purchasedCard.name}!`);

  // Marcar como vendido
  shopStock[slotId] = null;
  buttonElement.parentElement.innerHTML = '<p>¡Vendido!</p>';

  document.getElementById('shopCoins').textContent = gameState.totalCoins;
  updateStats();
  renderPlayerDeck();
}


function startNextRound() {
  if (gameState.currentRound >= gameState.maxRounds) {
    endGame();
    return;
  }
  
  gameState.currentRound++;
  gameState.peekingCardIndex = null;
  gameState.magnifyRevealedCards = []; // REGLA: Lupa se resetea
  gameState.cardsPlayedThisTurn = 0;
  
  initializeBoard();
  updateStats();
  showScreen('game');
  showToast(`¡Ronda ${gameState.currentRound}! 🎮`);
}

// --- LÓGICA DE FIN DE TURNO / JUEGO ---

function cancelAction() {
  gameState.selectedCard = null;
  gameState.waitingForBoardSelection = false;
  document.getElementById('cancelActionBtn').style.display = 'none';
  renderPlayerDeck();
}

function checkAutoEndTurn() {
  const availableCards = gameState.boardCards.filter(c => !c.removed).length;
  const canPlayMore = (gameMode === 'single') ? gameState.cardsPlayedThisTurn < 2 : false;

  if (availableCards === 0 || !canPlayMore) {
    setTimeout(() => endTurn(), 500);
  }
}

function endTurn() {
  gameState.doublePointsActive = false;
  gameState.megaRewardActive = false;
  saveCurrentPlayerState();

  if (gameMode !== 'single') {
    // Lógica multijugador...
    nextPlayer();
    // ...
  } else {
    // Lógica Un Jugador: MOSTRAR TIENDA
    showShop(true); // true = es fin de ronda
  }
}

function endGame() {
  showScreen('gameOver');
  // ... (código de fin de juego sin cambios)
}

function restartGame() {
  gameMode = 'single';
  players = [];
  currentPlayerIndex = 0;
  gameState.playerCards = [];
  showScreen('mode');
}

// --- FUNCIONES UTILITARIAS (UI) ---

function updateStats() {
  document.getElementById('currentRound').textContent = gameState.currentRound;
  document.getElementById('totalPoints').textContent = gameState.totalPoints;
  document.getElementById('correctAnswers').textContent = gameState.correctAnswers;
  document.getElementById('incorrectAnswers').textContent = gameState.incorrectAnswers;
  document.getElementById('cardsPlayed').textContent = gameState.cardsPlayedThisTurn;
  document.getElementById('totalCoins').textContent = gameState.totalCoins;
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 20px; left: 50%;
    transform: translateX(-50%);
    background: #333; color: white;
    padding: 15px 25px; border-radius: 12px;
    font-weight: 600; font-family: 'Montserrat', sans-serif;
    z-index: 2000; animation: slideInUp 0.3s ease-out;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  `;
  const styleSheet = document.head.querySelector('#toast-animations');
  if (!styleSheet) {
    const newStyleSheet = document.createElement("style");
    newStyleSheet.id = 'toast-animations';
    newStyleSheet.innerText = `
      @keyframes slideInUp { from { transform: translate(-50%, 100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      @keyframes slideOutDown { from { transform: translate(-50%, 0); opacity: 1; } to { transform: translate(-50%, 100px); opacity: 0; } }
    `;
    document.head.appendChild(newStyleSheet);
  }
  
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// --- Funciones de Partículas (Efectos) ---
function createCardUseEffect(cardElement) {
    if (!cardElement) return;
    const clone = cardElement.cloneNode(true);
    const rect = cardElement.getBoundingClientRect();
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.zIndex = '9999';
    clone.style.animation = 'cardUseEffect 0.8s ease-out forwards';
    clone.style.pointerEvents = 'none';
    document.body.appendChild(clone);
    setTimeout(() => clone.remove(), 800);
}

function createSuccessParticles(sourceElement) {
    const emojis = ['⭐', '✨', '🌟', '🪙', '🎉', '🏆'];
    const rect = sourceElement ? sourceElement.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);

    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            particle.style.position = 'fixed';
            particle.style.left = `${centerX}px`;
            particle.style.top = `${centerY}px`;
            particle.style.fontSize = `${(Math.random() * 10 + 20)}px`;
            particle.style.zIndex = '9999';
            const angle = (Math.random() * Math.PI * 2);
            const distance = Math.random() * 150 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            particle.style.animation = 'confettiExplosion 1s ease-out forwards';
            document.body.appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }, i * 20);
    }
}

function createErrorParticles(sourceElement) {
    const emojis = ['❌', '💔', '😢', '💥'];
    const rect = sourceElement ? sourceElement.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);

    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        particle.style.position = 'fixed';
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;
        particle.style.fontSize = `${(Math.random() * 8 + 16)}px`;
        particle.style.zIndex = '9999';
        const angle = (i / 12) * Math.PI * 2;
        const distance = Math.random() * 80 + 40;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.animation = 'confettiExplosion 0.7s ease-out forwards';
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 700);
    }
}