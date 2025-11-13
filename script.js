// --- VARIABLES GLOBALES Y CONSTANTES ---

let questions = {}; // Se llenará con la carga del JSON

// Costos de Monedas
const REROLL_COST = 2;
const REVEAL_COST = 5;
const PACK_PRICE = 10;

const defaultConfig = {
  game_title: "English Card Quest",
  instructions_text: "Selecciona cartas del tablero para responder. Gana monedas por aciertos y úsalas sabiamente."
};

let gameMode = 'single';
let players = [];
let currentPlayerIndex = 0;
let botDifficulty = 'medium';

let gameState = {
  currentRound: 1,
  maxRounds: 10,
  totalPoints: 0,
  totalCoins: 0, // <-- ¡NUEVA MONEDA!
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
  currentQuestionIndex: null // Para saber qué pregunta cambiar
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
      initializeEventListeners();
      // Configuración inicial solo para un jugador (demo)
      gameState.totalCoins = 5; // Empezar con 5 monedas
      updateStats();
    })
    .catch(error => console.error("Error al cargar las preguntas:", error));
});

function initializeEventListeners() {
  // Modo
  document.getElementById('singlePlayerBtn').addEventListener('click', startSinglePlayer);
  document.getElementById('challengeBtn').addEventListener('click', showChallengeConfig);
  document.getElementById('multiPlayerBtn').addEventListener('click', showMultiplayerConfig);
  document.getElementById('goToShopBtn').addEventListener('click', () => showScreen('shop'));

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
  document.getElementById('buyPackBtn').addEventListener('click', buyCardPack);

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

  // Mostrar la pantalla deseada
  if (screenName === 'mode') {
    document.getElementById('modeSelection').style.display = 'block';
  } else if (screenName === 'names') {
    document.getElementById('playerNamesScreen').style.display = 'block';
  } else if (screenName === 'game') {
    document.getElementById('gameScreen').style.display = 'block';
  } else if (screenName === 'gameOver') {
    document.getElementById('gameOverScreen').style.display = 'block';
  } else if (screenName === 'shop') {
    document.getElementById('shopScreen').style.display = 'flex';
    // Actualizar monedas en la tienda (solo para modo 1 jugador)
    if (gameMode === 'single') {
        document.getElementById('shopCoins').textContent = gameState.totalCoins;
    }
  }
}

// --- LÓGICA DE CONFIGURACIÓN DEL JUEGO ---

function startSinglePlayer() {
  gameMode = 'single';
  players = [];
  gameState.maxRounds = 10;
  document.getElementById('roundsConfig').style.display = 'none';
  showScreen('game');
  initializeGame();
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
    cards: generateInitialCards(), boardCards: [], peekingCards: []
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
  showScreen('game');
  document.getElementById('currentPlayerTurn').style.display = 'block';
  initializeGame();

  if (getCurrentPlayer().isBot) {
    setTimeout(playBotTurn, 1500);
  }
}

function generateInitialCards() {
  // Damos un mazo básico para empezar
  return [
    { id: Date.now() + Math.random(), name: "Eliminar", icon: "🗑️", description: "Elimina una carta del tablero", type: "remove" },
    { id: Date.now() + Math.random() + 1, name: "Ver Carta", icon: "👁️", description: "Ve la pregunta de una carta", type: "peek" },
    { id: Date.now() + Math.random() + 2, name: "Lupa", icon: "🔍", description: "Revela 4 cartas aleatorias", type: "magnify" }
  ];
}

// --- LÓGICA DE TURNOS Y JUGADORES (Bot) ---

function getCurrentPlayer() {
  if (gameMode === 'multiplayer' || gameMode === 'challenge') {
    return players[currentPlayerIndex];
  }
  return null; // Modo Un Jugador no usa 'players'
}

function nextPlayer() {
  if (gameMode === 'multiplayer' || gameMode === 'challenge') {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    updateCurrentPlayerDisplay();

    if (getCurrentPlayer().isBot) {
      setTimeout(playBotTurn, 1500);
    }
  }
}

// (La función playBotTurn es larga, la dejamos como estaba en tu código original)
// ... (playBotTurn() original va aquí) ...
function playBotTurn() {
  const player = getCurrentPlayer();
  if (!player || !player.isBot) return;

  const availableCards = gameState.boardCards.filter(card => !card.removed);
  if (availableCards.length === 0) {
    endTurn();
    return;
  }

  const useSpecialCard = Math.random() < 0.3 && gameState.playerCards.length > 0;

  if (useSpecialCard) {
    // ... (Lógica del Bot para usar cartas especiales) ...
  }

  // Lógica del Bot para responder pregunta
  const botAccuracy = botDifficulty === 'easy' ? 0.4 : botDifficulty === 'medium' ? 0.6 : 0.8;
  let targetCardIndex = gameState.boardCards.findIndex(card => !card.removed);
  
  if (targetCardIndex >= 0) {
    const card = gameState.boardCards[targetCardIndex];
    const correctAnswer = card.question.correct;
    const isCorrect = Math.random() < botAccuracy;
    
    setTimeout(() => {
      if (isCorrect) {
        let points = card.difficulty === 'easy' ? 10 : card.difficulty === 'medium' ? 20 : 30;
        if (gameState.doublePointsActive) points *= 2;
        
        gameState.totalPoints += points;
        gameState.correctAnswers++;
        // Los bots no ganan monedas para simplificar
        showToast(`${player.name} respondió correctamente! +${points} puntos`);
        
        // ... (lógica de mega recompensa, etc.) ...
      } else {
        gameState.incorrectAnswers++;
        showToast(`${player.name} respondió incorrectamente`);
        // ... (lógica de perder carta, etc.) ...
      }
      
      gameState.boardCards[targetCardIndex].removed = true;
      gameState.cardsPlayedThisTurn++;
      saveCurrentPlayerState();
      updateStats();
      renderBoard();
      renderPlayerDeck();

      setTimeout(() => {
        if (gameState.cardsPlayedThisTurn < 2 && gameState.boardCards.some(c => !c.removed)) {
          playBotTurn();
        } else {
          endTurn();
        }
      }, 1000);
    }, 1500);
  }
}


function updateCurrentPlayerDisplay() {
  if (gameMode === 'multiplayer' || gameMode === 'challenge') {
    const player = getCurrentPlayer();
    document.getElementById('currentPlayerName').textContent = player.name;
    // Cargar estado del jugador actual
    gameState.playerCards = [...player.cards];
    gameState.totalPoints = player.points;
    gameState.correctAnswers = player.correct;
    gameState.incorrectAnswers = player.incorrect;
    // Los bots y jugadores comparten monedas en esta versión simplificada
    // gameState.totalCoins = ... (si quisieras monedas por jugador)

    if (player.boardCards.length === 0) {
      initializeBoard();
      player.boardCards = [...gameState.boardCards];
      player.peekingCards = [];
    } else {
      gameState.boardCards = [...player.boardCards];
    }

    gameState.peekingCardIndex = null;
    updateStats();
    renderPlayerDeck();
    renderBoard();
  }
}

function saveCurrentPlayerState() {
  if (gameMode === 'multiplayer' || gameMode === 'challenge') {
    const player = getCurrentPlayer();
    player.cards = [...gameState.playerCards];
    player.points = gameState.totalPoints;
    player.correct = gameState.correctAnswers;
    player.incorrect = gameState.incorrectAnswers;
    player.boardCards = [...gameState.boardCards];
    // Guardar monedas si fueran por jugador
  }
  // En modo un jugador, el gameState global es el que se guarda
}

// --- LÓGICA PRINCIPAL DEL JUEGO ---

function initializeGame() {
  gameState.currentRound = 1;
  gameState.totalPoints = 0;
  // gameState.totalCoins = 5; // Reiniciar monedas o mantenerlas?
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
    gameState.playerCards = generateInitialCards();
    // Reiniciamos monedas para un jugador nuevo
    gameState.totalCoins = 5; 
  } else {
    document.getElementById('currentPlayerTurn').style.display = 'block';
    // Monedas se comparten o se reinician a 0 para multijugador
    gameState.totalCoins = 0; 
    updateCurrentPlayerDisplay();
  }

  initializeBoard();

  if (gameMode !== 'single') {
    getCurrentPlayer().boardCards = [...gameState.boardCards];
  }

  renderPlayerDeck();
  updateStats();
}

function initializeBoard() {
  gameState.boardCards = [];
  const difficulties = ['easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'hard', 'hard'];
  const shuffledDifficulties = difficulties.sort(() => Math.random() - 0.5);

  for (let i = 0; i < 8; i++) {
    const difficulty = shuffledDifficulties[i];
    const questionPool = questions[difficulty];
    if (!questionPool || questionPool.length === 0) {
        console.error(`No se encontraron preguntas para dificultad: ${difficulty}`);
        continue;
    }
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
      // FIX: No escribir el emoji "🎴" para que se vea el fondo CSS
      cardEl.innerHTML = ''; 
      
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

function renderPlayerDeck() {
  const playerDeck = document.getElementById('playerDeck');
  playerDeck.innerHTML = '';

  gameState.playerCards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'player-card';

    if (gameState.selectedCard && gameState.selectedCard.id === card.id) {
      cardEl.classList.add('selected');
    }

    // --- LÓGICA DEL JOKER (WILD CARD) ---
    if (card.type === 'wildcard') {
      cardEl.classList.add('joker-card');
      cardEl.innerHTML = `
        <img src="images/joker_card.png" alt="Joker" class="joker-image"/>
        <div class="card-name">${card.name}</div>
        <div class="card-description">${card.description}</div>
      `;
    } else {
      // Carta normal
      cardEl.innerHTML = `
        <div class="card-icon">${card.icon}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-description">${card.description}</div>
      `;
    }
    // --- FIN LÓGICA DEL JOKER ---

    cardEl.addEventListener('click', () => handlePlayerCardClick(card));
    playerDeck.appendChild(cardEl);
  });
}

function generateRandomCard() {
  const baseCardTypes = [
    { name: "Eliminar", icon: "🗑️", description: "Elimina una carta del tablero", type: "remove" },
    { name: "Ver Carta", icon: "👁️", description: "Ve la pregunta de una carta", type: "peek" },
    { name: "Bonus", icon: "⭐", description: "Gana 50 puntos extra", type: "bonus" },
    { name: "Joker", icon: "🃏", description: "Responde automáticamente correcto", type: "wildcard" }, // <-- JOKER
    { name: "Cambiar", icon: "🔄", description: "Cambia la pregunta o baja dificultad", type: "change" },
    { name: "Intercambio", icon: "💰", description: "10 monedas por 2 cartas", type: "trade" }, // Actualizado
    { name: "Lupa", icon: "🔍", description: "Revela 4 cartas aleatorias", type: "magnify" },
    { name: "Turno Extra", icon: "⚡", description: "Juega una carta adicional", type: "extraTurn" },
    { name: "Mega Recompensa", icon: "🎁", description: "Gana 4 cartas al responder bien", type: "megaReward" },
    { name: "Duplicador", icon: "💎", description: "Duplica puntos de la siguiente pregunta", type: "doublePoints" },
    { name: "Respuesta", icon: "💡", description: "Muestra la respuesta correcta", type: "answer" }
  ];

  const multiplayerCardTypes = [
    { name: "Robar Carta", icon: "🎯", description: "Roba una carta de otro jugador", type: "steal" },
    { name: "Quitar Puntos", icon: "💣", description: "Quita 30 puntos a un jugador", type: "sabotage" }
  ];

  const cardTypes = (gameMode !== 'single') ? [...baseCardTypes, ...multiplayerCardTypes] : baseCardTypes;
  
  // Lógica para evitar cartas duplicadas si es necesario...
  const selectedCard = cardTypes[Math.floor(Math.random() * cardTypes.length)];
  
  // Añadir un ID único
  return { ...selectedCard, id: Date.now() + Math.random() };
}

// --- LÓGICA DE INTERACCIÓN ---

function handlePlayerCardClick(card) {
  // ... (Misma lógica que antes para Bonus, MegaReward, DoublePoints, etc.) ...
  
  if (card.type === 'trade') {
    if (gameState.totalCoins >= 10) {
      createCardUseEffect(event.currentTarget);
      gameState.totalCoins -= 10;
      const newCard1 = generateRandomCard();
      const newCard2 = generateRandomCard();
      if (newCard1) gameState.playerCards.push(newCard1);
      if (newCard2) gameState.playerCards.push(newCard2);
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== card.id);
      saveCurrentPlayerState();
      updateStats();
      renderPlayerDeck();
      showToast('¡Intercambio! -10 monedas, +2 cartas 💰');
    } else {
      showToast('⚠️ Necesitas 10 monedas para usar Intercambio');
    }
    return;
  }
  
  // ... (Resto de la lógica de handlePlayerCardClick) ...

  // Para 'remove', 'peek', 'wildcard', 'change', 'answer'
  gameState.selectedCard = card;
  gameState.waitingForBoardSelection = true;
  document.getElementById('cancelActionBtn').style.display = 'block';
  renderPlayerDeck();
  showToast(`Selecciona una carta del tablero para ${card.name.toLowerCase()}`);
}

function handleBoardCardClick(index) {
  const card = gameState.boardCards[index];
  if (card.removed) return;

  if (gameState.cardsPlayedThisTurn >= 2 && gameMode === 'single') {
    showToast('⚠️ Ya jugaste 2 cartas este turno. Presiona "Terminar Turno"');
    return;
  }
  
  // Guardar índice de la carta actual para Reroll/Reveal
  gameState.currentQuestionIndex = index;

  if (gameState.waitingForBoardSelection && gameState.selectedCard) {
    // --- ACCIÓN DE CARTA ESPECIAL ---
    const specialCard = gameState.selectedCard;
    
    // ... (Lógica para 'remove', 'peek', 'change', 'answer') ...

    if (specialCard.type === 'wildcard') { // JOKER
      const points = card.difficulty === 'easy' ? 10 : card.difficulty === 'medium' ? 20 : 30;
      gameState.totalPoints += points;
      gameState.correctAnswers++;
      gameState.boardCards[index].removed = true;
      gameState.cardsPlayedThisTurn++;
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== specialCard.id);

      // ¡El Joker no te da una carta nueva gratis, pero sí una moneda!
      gameState.totalCoins++;
      showToast(`¡Joker! +${points} puntos y +1 moneda 🃏`);
      
      createSuccessParticles();
      cancelAction();
      updateStats();
      renderBoard();
      renderPlayerDeck();
    }
    
  } else {
    // --- ABRIR PREGUNTA NORMAL ---
    showQuestion(card, index);
  }
}

function showQuestion(card, cardIndex) {
  const modal = document.getElementById('questionModal');
  const content = document.getElementById('questionContent');
  gameState.currentQuestionIndex = cardIndex; // Asegurar que esté guardado

  const difficultyText = card.difficulty === 'easy' ? 'Fácil' : card.difficulty === 'medium' ? 'Desafiante' : 'Difícil';
  const difficultyClass = `difficulty-${card.difficulty}`;

  // Construir el HTML del Modal con los nuevos botones
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

  // Añadir listeners a los nuevos botones
  document.getElementById('rerollQuestionBtn').addEventListener('click', rerollQuestion);
  document.getElementById('revealAnswerBtn').addEventListener('click', revealAnswer);

  modal.classList.add('active');
}

function checkAnswer(selectedIndex, card, cardIndex, btnElement) {
  const isCorrect = selectedIndex === card.question.correct;
  const allButtons = document.querySelectorAll('.answer-btn');

  allButtons.forEach(btn => { btn.disabled = true; });

  // Desactivar helpers
  document.getElementById('rerollQuestionBtn').disabled = true;
  document.getElementById('revealAnswerBtn').disabled = true;

  // Encontrar el botón correcto para resaltarlo
  const correctButtonText = card.question.answers[card.question.correct];
  allButtons.forEach(btn => {
      if (btn.textContent === correctButtonText) {
          btn.classList.add('correct');
      }
  });

  if (!isCorrect) {
    btnElement.classList.add('incorrect');
  }

  const content = document.getElementById('questionContent');
  const resultDiv = document.createElement('div');
  resultDiv.className = `result-message ${isCorrect ? 'correct' : 'incorrect'}`;

  if (isCorrect) {
    let points = card.difficulty === 'easy' ? 10 : card.difficulty === 'medium' ? 20 : 30;
    if (gameState.doublePointsActive) points *= 2;
    
    gameState.totalPoints += points;
    gameState.correctAnswers++;
    gameState.totalCoins++; // <-- ¡GANAR MONEDA!

    resultDiv.textContent = `¡Correcto! +${points} puntos y +1 Moneda 🪙`;
    createSuccessParticles(btnElement);
    
    // ... (lógica de Mega Recompensa, etc.) ...
    
  } else {
    gameState.incorrectAnswers++;
    resultDiv.textContent = `¡Incorrecto! La respuesta era: "${correctButtonText}"`;
    createErrorParticles(btnElement);
    // ... (lógica de perder carta, etc.) ...
  }
  
  // Desactivar duplicador/mega recompensa si se usaron
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
    showToast(`⚠️ Necesitas ${REROLL_COST} monedas para cambiar la pregunta.`);
    return;
  }

  // Pagar el costo
  gameState.totalCoins -= REROLL_COST;
  updateStats();
  
  // Encontrar la carta actual y su dificultad
  const cardIndex = gameState.currentQuestionIndex;
  const currentDifficulty = gameState.boardCards[cardIndex].difficulty;
  
  // Encontrar una nueva pregunta de la misma dificultad
  const questionPool = questions[currentDifficulty];
  const newQuestion = questionPool[Math.floor(Math.random() * questionPool.length)];
  
  // Reemplazar la pregunta
  gameState.boardCards[cardIndex].question = newQuestion;
  
  // Volver a mostrar el modal con la nueva pregunta
  document.getElementById('questionModal').classList.remove('active');
  // Pequeña espera para que se note el cambio
  setTimeout(() => {
    showQuestion(gameState.boardCards[cardIndex], cardIndex);
    showToast("¡Pregunta cambiada!");
  }, 200);
}

function revealAnswer() {
  if (gameState.totalCoins < REVEAL_COST) {
    showToast(`⚠️ Necesitas ${REVEAL_COST} monedas para revelar la respuesta.`);
    return;
  }
  
  // Pagar el costo
  gameState.totalCoins -= REVEAL_COST;
  updateStats();
  
  // Desactivar el botón para no usarlo de nuevo
  document.getElementById('revealAnswerBtn').disabled = true;

  // Encontrar la respuesta correcta
  const card = gameState.boardCards[gameState.currentQuestionIndex];
  const correctAnswerText = card.question.answers[card.question.correct];
  
  // Resaltar el botón correcto
  const allButtons = document.querySelectorAll('.answer-btn');
  allButtons.forEach(btn => {
    if (btn.textContent === correctAnswerText) {
      btn.classList.add('revealed');
    }
  });
  
  showToast("¡Respuesta revelada! Haz clic en ella.");
}

function buyCardPack() {
  // Esta función ahora solo es para modo un jugador
  if (gameMode !== 'single') {
    showToast("⚠️ La tienda solo está disponible en modo 'Un Jugador'.");
    return;
  }

  if (gameState.totalCoins >= PACK_PRICE) {
    gameState.totalCoins -= PACK_PRICE;
    
    const newCard = generateRandomCard();
    if (newCard) {
      gameState.playerCards.push(newCard);
      showToast(`¡Compraste un sobre! Obtuviste: ${newCard.name}`);
    } else {
      showToast("¡Ups! Error al generar la carta.");
      gameState.totalCoins += PACK_PRICE; // Devolver dinero
    }

    // Actualizar UI
    document.getElementById('shopCoins').textContent = gameState.totalCoins;
    updateStats();
    renderPlayerDeck();

  } else {
    showToast("⚠️ ¡Monedas insuficientes!");
  }
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
  const canPlayMore = (gameMode === 'single') ? gameState.cardsPlayedThisTurn < 2 : gameState.cardsPlayedThisTurn < 1; // 1 jugada por turno en multi

  if (availableCards === 0 || !canPlayMore) {
    setTimeout(() => endTurn(), 500);
  }
}

function endTurn() {
  // En modo Un Jugador, ganas una carta al final del turno
  if (gameMode === 'single') {
      const newCard = generateRandomCard();
      if (newCard) {
        gameState.playerCards.push(newCard);
        showToast('¡Ganaste una carta por terminar tu turno! 🎴');
      }
  }

  gameState.doublePointsActive = false;
  gameState.megaRewardActive = false;
  saveCurrentPlayerState();

  if (gameMode !== 'single') {
    // Lógica multijugador
    nextPlayer();
    gameState.peekingCardIndex = null;
    gameState.cardsPlayedThisTurn = 0;
    updateStats();
    showToast(`Turno de ${getCurrentPlayer().name} 🎮`);

    if (currentPlayerIndex === 0) { // Ronda completada
      if (gameState.currentRound >= gameState.maxRounds) {
        endGame(); return;
      }
      gameState.currentRound++;
      players.forEach(p => { p.boardCards = []; p.peekingCards = []; });
      initializeBoard();
      getCurrentPlayer().boardCards = [...gameState.boardCards];
      showToast(`¡Ronda ${gameState.currentRound}! 🎮`);
    }
  } else {
    // Lógica Un Jugador
    if (gameState.currentRound >= gameState.maxRounds) {
      endGame(); return;
    }
    gameState.currentRound++;
    gameState.peekingCardIndex = null;
    gameState.cardsPlayedThisTurn = 0;
    initializeBoard();
    updateStats();
    showToast(`¡Ronda ${gameState.currentRound}! 🎮`);
  }
}

function endGame() {
  showScreen('gameOver');

  if (gameMode === 'single') {
    document.getElementById('singlePlayerResults').style.display = 'block';
    document.getElementById('multiPlayerResults').style.display = 'none';
    document.getElementById('finalPoints').textContent = gameState.totalPoints;
    document.getElementById('finalCorrect').textContent = gameState.correctAnswers;
    const totalQuestions = gameState.correctAnswers + gameState.incorrectAnswers;
    const accuracy = totalQuestions > 0 ? Math.round((gameState.correctAnswers / totalQuestions) * 100) : 0;
    document.getElementById('finalAccuracy').textContent = accuracy + '%';
  } else {
    document.getElementById('singlePlayerResults').style.display = 'none';
    document.getElementById('multiPlayerResults').style.display = 'block';
    
    // ... (Lógica de ranking multijugador) ...
  }
}

function restartGame() {
  gameMode = 'single';
  players = [];
  currentPlayerIndex = 0;
  document.getElementById('currentPlayerTurn').style.display = 'none';
  showScreen('mode');
  // Las monedas y el mazo se reiniciarán cuando se llame a initializeGame()
}

// --- FUNCIONES UTILITARIAS (UI) ---

function updateStats() {
  document.getElementById('currentRound').textContent = gameState.currentRound;
  document.getElementById('totalPoints').textContent = gameState.totalPoints;
  document.getElementById('correctAnswers').textContent = gameState.correctAnswers;
  document.getElementById('incorrectAnswers').textContent = gameState.incorrectAnswers;
  document.getElementById('cardsPlayed').textContent = gameState.cardsPlayedThisTurn;
  document.getElementById('totalCoins').textContent = gameState.totalCoins; // <-- ACTUALIZAR MONEDAS
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px; /* Cambiado a bottom */
    left: 50%;
    transform: translateX(-50%); /* Centrado */
    background: #333;
    color: white;
    padding: 15px 25px;
    border-radius: 12px;
    font-weight: 600;
    font-family: 'Montserrat', sans-serif;
    z-index: 2000;
    animation: slideInUp 0.3s ease-out;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  `;
  // Definir animaciones
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes slideInUp { from { transform: translate(-50%, 100px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    @keyframes slideOutDown { from { transform: translate(-50%, 0); opacity: 1; } to { transform: translate(-50%, 100px); opacity: 0; } }
  `;
  document.head.appendChild(styleSheet);
  
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutDown 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// --- Funciones de Partículas (Efectos) ---
// (Estas funciones (createCardUseEffect, createSuccessParticles, createErrorParticles)
// se mantienen igual que en el código original, asegúrate de que estén aquí)

function createCardUseEffect(cardElement) {
    if (!cardElement) return;
    const clone = cardElement.cloneNode(true);
    const rect = cardElement.getBoundingClientRect();
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
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
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            particle.style.fontSize = (Math.random() * 10 + 20) + 'px';
            particle.style.zIndex = '9999';
            const angle = (Math.random() * Math.PI * 2);
            const distance = Math.random() * 150 + 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');
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
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.fontSize = (Math.random() * 8 + 16) + 'px';
        particle.style.zIndex = '9999';
        const angle = (i / 12) * Math.PI * 2;
        const distance = Math.random() * 80 + 40;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.animation = 'confettiExplosion 0.7s ease-out forwards';
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 700);
    }
}