// --- Variables Globales y Configuración ---

let questions = {}; // Se llenará con la carga del JSON

const defaultConfig = {
  game_title: "English Card Quest",
  instructions_text: "Selecciona cartas del tablero para responder preguntas de inglés. Usa tus cartas especiales estratégicamente para eliminar cartas, ver preguntas o ganar puntos. ¡Completa 10 rondas y obtén la mayor puntuación!"
};

let gameMode = 'single';
let players = [];
let currentPlayerIndex = 0;
let botDifficulty = 'medium';

let gameState = {
  currentRound: 1,
  maxRounds: 10,
  totalPoints: 0,
  correctAnswers: 0,
  incorrectAnswers: 0,
  boardCards: [],
  playerCards: [
    { id: 1, name: "Eliminar", icon: "🗑️", description: "Elimina una carta del tablero", type: "remove" },
    { id: 2, name: "Ver Carta", icon: "👁️", description: "Ve la pregunta de una carta", type: "peek" }
  ],
  selectedCard: null,
  waitingForBoardSelection: false,
  peekingCardIndex: null,
  magnifyRevealedCards: [],
  cardsPlayedThisTurn: 0,
  doublePointsActive: false,
  megaRewardActive: false
};

// --- Carga Inicial y Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
  // Carga las preguntas y luego inicializa el juego
  fetch('questions.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('No se pudo cargar questions.json');
      }
      return response.json();
    })
    .then(data => {
      questions = data;
      // Ahora que las preguntas están cargadas, configuramos los botones
      initializeEventListeners();
    })
    .catch(error => console.error("Error al cargar las preguntas:", error));
});

function initializeEventListeners() {
  // Botones de la pantalla de modo
  document.getElementById('singlePlayerBtn').addEventListener('click', startSinglePlayer);
  document.getElementById('challengeBtn').addEventListener('click', showChallengeConfig);
  document.getElementById('multiPlayerBtn').addEventListener('click', showMultiplayerConfig);

  // Botones de la pantalla de configuración
  document.getElementById('backToModeBtn').addEventListener('click', () => showScreen('mode'));
  document.getElementById('startGameBtn').addEventListener('click', startConfiguredGame);

  // Botones del juego
  document.getElementById('endTurnBtn').addEventListener('click', endTurn);
  document.getElementById('cancelActionBtn').addEventListener('click', cancelAction);
  document.getElementById('exitToMenuBtn').addEventListener('click', restartGame);

  // Botón de fin de juego
  document.getElementById('restartBtn').addEventListener('click', restartGame);

  // Checkboxes de Bot
  document.getElementById('player2Bot').addEventListener('change', (e) => {
    document.getElementById('player2Name').disabled = e.target.checked;
    if (e.target.checked) {
      document.getElementById('player2Name').value = '';
      document.getElementById('player2Name').placeholder = 'Bot activado';
    } else {
      document.getElementById('player2Name').placeholder = 'Nombre del Jugador 2';
    }
  });

  document.getElementById('player3Bot').addEventListener('change', (e) => {
    document.getElementById('player3Name').disabled = e.target.checked;
    if (e.target.checked) {
      document.getElementById('player3Name').value = '';
      document.getElementById('player3Name').placeholder = 'Bot activado';
    } else {
      document.getElementById('player3Name').placeholder = 'Nombre del Jugador 3';
    }
  });

  document.getElementById('player4Bot').addEventListener('change', (e) => {
    document.getElementById('player4Name').disabled = e.target.checked;
    if (e.target.checked) {
      document.getElementById('player4Name').value = '';
      document.getElementById('player4Name').placeholder = 'Bot activado';
    } else {
      document.getElementById('player4Name').placeholder = 'Nombre del Jugador 4';
    }
  });
}

// --- Lógica de Navegación de Pantallas ---

function showScreen(screenName) {
  document.getElementById('modeSelection').style.display = 'none';
  document.getElementById('playerNamesScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'none';
  document.getElementById('gameOverScreen').style.display = 'none';

  if (screenName === 'mode') {
    document.getElementById('modeSelection').style.display = 'block';
  } else if (screenName === 'names') {
    document.getElementById('playerNamesScreen').style.display = 'block';
  } else if (screenName === 'game') {
    document.getElementById('gameScreen').style.display = 'block';
  } else if (screenName === 'gameOver') {
    document.getElementById('gameOverScreen').style.display = 'block';
  }
}

// --- Lógica de Configuración del Juego ---

function startSinglePlayer() {
  gameMode = 'single';
  players = [];
  gameState.maxRounds = 10; // Resetea a 10 para un jugador
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
  document.getElementById('configTitle').textContent = 'Modo Multijugador (4 Jugadores)';
  document.getElementById('player3Config').style.display = 'block';
  document.getElementById('player4Config').style.display = 'block';
  document.getElementById('roundsConfig').style.display = 'block';
  showScreen('names');
}

function startConfiguredGame() {
  const maxRounds = parseInt(document.getElementById('maxRounds').value) || 10;
  gameState.maxRounds = Math.min(Math.max(maxRounds, 1), 40);
  botDifficulty = document.getElementById('botDifficulty').value;

  if (gameMode === 'challenge') {
    const name1 = document.getElementById('player1Name').value.trim() || 'Jugador 1';
    const isBot2 = document.getElementById('player2Bot').checked;
    const name2 = isBot2 ? '🤖 Bot' : (document.getElementById('player2Name').value.trim() || 'Jugador 2');

    players = [
      { name: name1, points: 0, correct: 0, incorrect: 0, isBot: false, cards: generateInitialCards(), boardCards: [], peekingCards: [] },
      { name: name2, points: 0, correct: 0, incorrect: 0, isBot: isBot2, cards: generateInitialCards(), boardCards: [], peekingCards: [] }
    ];
  } else if (gameMode === 'multiplayer') {
    const name1 = document.getElementById('player1Name').value.trim() || 'Jugador 1';
    const isBot2 = document.getElementById('player2Bot').checked;
    const name2 = isBot2 ? '🤖 Bot 1' : (document.getElementById('player2Name').value.trim() || 'Jugador 2');
    const isBot3 = document.getElementById('player3Bot').checked;
    const name3 = isBot3 ? '🤖 Bot 2' : (document.getElementById('player3Name').value.trim() || 'Jugador 3');
    const isBot4 = document.getElementById('player4Bot').checked;
    const name4 = isBot4 ? '🤖 Bot 3' : (document.getElementById('player4Name').value.trim() || 'Jugador 4');

    players = [
      { name: name1, points: 0, correct: 0, incorrect: 0, isBot: false, cards: generateInitialCards(), boardCards: [], peekingCards: [] },
      { name: name2, points: 0, correct: 0, incorrect: 0, isBot: isBot2, cards: generateInitialCards(), boardCards: [], peekingCards: [] },
      { name: name3, points: 0, correct: 0, incorrect: 0, isBot: isBot3, cards: generateInitialCards(), boardCards: [], peekingCards: [] },
      { name: name4, points: 0, correct: 0, incorrect: 0, isBot: isBot4, cards: generateInitialCards(), boardCards: [], peekingCards: [] }
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
  return [
    { id: Date.now() + Math.random(), name: "Eliminar", icon: "🗑️", description: "Elimina una carta del tablero", type: "remove" },
    { id: Date.now() + Math.random() + 1, name: "Ver Carta", icon: "👁️", description: "Ve la pregunta de una carta", type: "peek" },
    { id: Date.now() + Math.random() + 2, name: "Lupa", icon: "🔍", description: "Revela 4 cartas aleatorias", type: "magnify" },
    { id: Date.now() + Math.random() + 3, name: "Respuesta", icon: "💡", description: "Muestra la respuesta correcta", type: "answer" }
  ];
}

// --- Lógica de Turnos y Jugadores ---

function getCurrentPlayer() {
  if (gameMode === 'multiplayer' || gameMode === 'challenge') {
    return players[currentPlayerIndex];
  }
  return null;
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
    const specialCards = gameState.playerCards.filter(c =>
      c.type === 'remove' || c.type === 'peek' || c.type === 'wildcard' ||
      c.type === 'change' || c.type === 'bonus' || c.type === 'magnify'
    );

    if (specialCards.length > 0) {
      const selectedSpecialCard = specialCards[Math.floor(Math.random() * specialCards.length)];

      if (selectedSpecialCard.type === 'bonus') {
        gameState.totalPoints += 50;
        gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);
        showToast(`${player.name} usó Bonus! +50 puntos 🌟`);
        saveCurrentPlayerState();
        updateStats();
        renderPlayerDeck();
        setTimeout(playBotTurn, 1000);
        return;
      } else if (selectedSpecialCard.type === 'magnify') {
        const hiddenCards = gameState.boardCards
          .map((card, index) => ({ card, index }))
          .filter(item => !item.card.removed && !player.peekingCards.includes(item.index));

        const cardsToReveal = Math.min(4, hiddenCards.length);
        for (let i = 0; i < cardsToReveal; i++) {
          const randomIndex = Math.floor(Math.random() * hiddenCards.length);
          const cardToReveal = hiddenCards.splice(randomIndex, 1)[0];
          player.peekingCards.push(cardToReveal.index);
        }

        gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);
        showToast(`${player.name} usó Lupa! 🔍 Reveló ${cardsToReveal} cartas`);
        saveCurrentPlayerState();
        renderPlayerDeck();
        renderBoard();
        setTimeout(playBotTurn, 1000);
        return;
      } else if (selectedSpecialCard.type === 'trade') {
        if (gameState.totalPoints >= 20) {
          gameState.totalPoints -= 20;
          const newCard1 = generateRandomCard();
          const newCard2 = generateRandomCard();
          if (newCard1) gameState.playerCards.push(newCard1);
          if (newCard2) gameState.playerCards.push(newCard2);
          gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);
          showToast(`${player.name} usó Intercambio! 🔄 -20 puntos, +2 cartas`);
          saveCurrentPlayerState();
          updateStats();
          renderPlayerDeck();
          setTimeout(playBotTurn, 1000);
          return;
        }
      } else if (selectedSpecialCard.type === 'extraTurn') {
        gameState.cardsPlayedThisTurn = Math.max(0, gameState.cardsPlayedThisTurn - 1);
        gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);
        showToast(`${player.name} usó Turno Extra! ⚡`);
        saveCurrentPlayerState();
        updateStats();
        renderPlayerDeck();
        setTimeout(playBotTurn, 1000);
        return;
      } else if (selectedSpecialCard.type === 'megaReward') {
        gameState.megaRewardActive = true;
        gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);
        showToast(`${player.name} activó Mega Recompensa! 🎁`);
        saveCurrentPlayerState();
        renderPlayerDeck();
        setTimeout(playBotTurn, 1000);
        return;
      } else if (selectedSpecialCard.type === 'doublePoints') {
        gameState.doublePointsActive = true;
        gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);
        showToast(`${player.name} activó Duplicador! 💎`);
        saveCurrentPlayerState();
        renderPlayerDeck();
        setTimeout(playBotTurn, 1000);
        return;
      } else if (selectedSpecialCard.type === 'wildcard') {
        const randomCardIndex = gameState.boardCards.findIndex(card => !card.removed);
        if (randomCardIndex >= 0) {
          const card = gameState.boardCards[randomCardIndex];
          const points = card.difficulty === 'easy' ? 10 : card.difficulty === 'medium' ? 20 : 30;
          gameState.totalPoints += points;
          gameState.correctAnswers++;
          gameState.boardCards[randomCardIndex].removed = true;
          gameState.cardsPlayedThisTurn++;
          gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);

          const newCard = generateRandomCard();
          if (newCard) gameState.playerCards.push(newCard);

          showToast(`${player.name} usó Comodín! +${points} puntos 🃏`);
          saveCurrentPlayerState();
          updateStats();
          renderBoard();
          renderPlayerDeck();
          setTimeout(() => {
            if (gameState.cardsPlayedThisTurn < 2) {
              playBotTurn();
            } else {
              endTurn();
            }
          }, 1000);
          return;
        }
      } else if (selectedSpecialCard.type === 'remove') {
        const hardCards = gameState.boardCards
          .map((card, index) => ({ card, index }))
          .filter(item => !item.card.removed && item.card.difficulty === 'hard');

        const targetIndex = hardCards.length > 0
          ? hardCards[0].index
          : gameState.boardCards.findIndex(card => !card.removed);

        if (targetIndex >= 0) {
          gameState.boardCards[targetIndex].removed = true;
          gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);
          showToast(`${player.name} eliminó una carta! 🗑️`);
          saveCurrentPlayerState();
          renderBoard();
          renderPlayerDeck();
          setTimeout(playBotTurn, 1000);
          return;
        }
      } else if (selectedSpecialCard.type === 'change') {
        const hardOrMediumCards = gameState.boardCards
          .map((card, index) => ({ card, index }))
          .filter(item => !item.card.removed && (item.card.difficulty === 'hard' || item.card.difficulty === 'medium'));

        if (hardOrMediumCards.length > 0) {
          const targetCard = hardOrMediumCards[0];
          const newDifficulty = targetCard.card.difficulty === 'hard' ? 'medium' : 'easy';
          const questionPool = questions[newDifficulty];
          const randomQuestion = questionPool[Math.floor(Math.random() * questionPool.length)];

          gameState.boardCards[targetCard.index].difficulty = newDifficulty;
          gameState.boardCards[targetCard.index].question = randomQuestion;
          gameState.playerCards = gameState.playerCards.filter(c => c.id !== selectedSpecialCard.id);

          showToast(`${player.name} cambió una carta! 🔄`);
          saveCurrentPlayerState();
          renderBoard();
          renderPlayerDeck();
          setTimeout(playBotTurn, 1000);
          return;
        }
      }
    }
  }

  const botAccuracy = botDifficulty === 'easy' ? 0.4 : botDifficulty === 'medium' ? 0.6 : 0.8;

  let targetCardIndex = -1;
  if (botAccuracy < 0.7) {
    const easyCards = gameState.boardCards
      .map((card, index) => ({ card, index }))
      .filter(item => !item.card.removed && item.card.difficulty === 'easy');

    if (easyCards.length > 0) {
      targetCardIndex = easyCards[Math.floor(Math.random() * easyCards.length)].index;
    }
  }

  if (targetCardIndex === -1) {
    targetCardIndex = gameState.boardCards.findIndex(card => !card.removed);
  }

  if (targetCardIndex >= 0) {
    const card = gameState.boardCards[targetCardIndex];
    const correctAnswer = card.question.correct;
    const isCorrect = Math.random() < botAccuracy;
    const selectedAnswer = isCorrect ? correctAnswer : (correctAnswer + 1) % card.question.answers.length;

    setTimeout(() => {
      if (isCorrect) {
        let points = card.difficulty === 'easy' ? 10 : card.difficulty === 'medium' ? 20 : 30;

        if (gameState.doublePointsActive) {
          points *= 2;
          gameState.doublePointsActive = false;
          showToast(`${player.name} respondió correctamente! +${points} puntos (DUPLICADOS 💎)`);
        } else {
          showToast(`${player.name} respondió correctamente! +${points} puntos`);
        }

        gameState.totalPoints += points;
        gameState.correctAnswers++;

        if (gameState.megaRewardActive) {
          for (let i = 0; i < 4; i++) {
            const newCard = generateRandomCard();
            if (newCard) {
              gameState.playerCards.push(newCard);
            }
          }
          gameState.megaRewardActive = false;
          showToast(`${player.name} ganó 4 cartas especiales! 🎁`);
        } else {
          const newCard = generateRandomCard();
          if (newCard) {
            gameState.playerCards.push(newCard);
          }
        }
      } else {
        gameState.incorrectAnswers++;
        gameState.doublePointsActive = false;
        gameState.megaRewardActive = false;
        showToast(`${player.name} respondió incorrectamente`);

        if (gameState.playerCards.length > 0) {
          const randomIndex = Math.floor(Math.random() * gameState.playerCards.length);
          gameState.playerCards.splice(randomIndex, 1);
        }
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
    gameState.playerCards = [...player.cards];
    gameState.totalPoints = player.points;
    gameState.correctAnswers = player.correct;
    gameState.incorrectAnswers = player.incorrect;

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
  }
}

// --- Lógica Principal del Juego ---

function initializeGame() {
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
    gameState.playerCards = [
      { id: Date.now(), name: "Eliminar", icon: "🗑️", description: "Elimina una carta del tablero", type: "remove" },
      { id: Date.now() + 1, name: "Ver Carta", icon: "👁️", description: "Ve la pregunta de una carta", type: "peek" },
      { id: Date.now() + 2, name: "Lupa", icon: "🔍", description: "Revela 4 cartas aleatorias", type: "magnify" },
      { id: Date.now() + 3, name: "Respuesta", icon: "💡", description: "Muestra la respuesta correcta", type: "answer" }
    ];
  } else if (gameMode === 'multiplayer' || gameMode === 'challenge') {
    document.getElementById('currentPlayerTurn').style.display = 'block';
    const player = getCurrentPlayer();
    gameState.playerCards = [...player.cards];
    updateCurrentPlayerDisplay();
  }

  initializeBoard();

  if (gameMode === 'multiplayer' || gameMode === 'challenge') {
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

// --- Lógica de Renderizado (UI) ---

function renderBoard() {
  const boardGrid = document.getElementById('boardGrid');
  boardGrid.innerHTML = '';
  const player = getCurrentPlayer();
  let revealedIndices = [];

  if (gameMode === 'multiplayer' || gameMode === 'challenge') {
    revealedIndices = player ? player.peekingCards : [];
  } else {
    if (gameState.peekingCardIndex !== null) {
      revealedIndices.push(gameState.peekingCardIndex);
    }
    if (gameState.magnifyRevealedCards) {
      revealedIndices.push(...gameState.magnifyRevealedCards);
    }
  }

  gameState.boardCards.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'board-card';

    if (card.removed) {
      cardEl.classList.add('removed');
      cardEl.innerHTML = '❌';
    } else {
      cardEl.innerHTML = '🎴';
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

    cardEl.innerHTML = `
      <div class="card-icon">${card.icon}</div>
      <div class="card-name">${card.name}</div>
      <div class="card-description">${card.description}</div>
    `;
    cardEl.addEventListener('click', () => handlePlayerCardClick(card));
    playerDeck.appendChild(cardEl);
  });
}

function generateRandomCard() {
  const baseCardTypes = [
    { id: Date.now() + Math.random(), name: "Eliminar", icon: "🗑️", description: "Elimina una carta del tablero", type: "remove" },
    { id: Date.now() + Math.random(), name: "Ver Carta", icon: "👁️", description: "Ve la pregunta de una carta", type: "peek" },
    { id: Date.now() + Math.random(), name: "Bonus", icon: "⭐", description: "Gana 50 puntos extra", type: "bonus" },
    { id: Date.now() + Math.random(), name: "Comodín", icon: "🃏", description: "Responde automáticamente correcto", type: "wildcard" },
    { id: Date.now() + Math.random(), name: "Cambiar", icon: "🔄", description: "Cambia la pregunta o baja dificultad", type: "change" },
    { id: Date.now() + Math.random(), name: "Intercambio", icon: "💰", description: "20 puntos por 2 cartas", type: "trade" },
    { id: Date.now() + Math.random(), name: "Lupa", icon: "🔍", description: "Revela 4 cartas aleatorias", type: "magnify" },
    { id: Date.now() + Math.random(), name: "Turno Extra", icon: "⚡", description: "Juega una carta adicional", type: "extraTurn" },
    { id: Date.now() + Math.random(), name: "Mega Recompensa", icon: "🎁", description: "Gana 4 cartas al responder bien", type: "megaReward" },
    { id: Date.now() + Math.random(), name: "Duplicador", icon: "💎", description: "Duplica puntos de la siguiente pregunta", type: "doublePoints" },
    { id: Date.now() + Math.random(), name: "Respuesta", icon: "💡", description: "Muestra la respuesta correcta", type: "answer" }
  ];

  const multiplayerCardTypes = [
    { id: Date.now() + Math.random(), name: "Robar Carta", icon: "🎯", description: "Roba una carta de otro jugador", type: "steal" },
    { id: Date.now() + Math.random(), name: "Quitar Puntos", icon: "💣", description: "Quita 30 puntos a un jugador", type: "sabotage" }
  ];

  const cardTypes = (gameMode === 'multiplayer' || gameMode === 'challenge') ? [...baseCardTypes, ...multiplayerCardTypes] : baseCardTypes;

  const filteredCardTypes = cardTypes.filter(card => {
    if (card.type === 'trade') {
      const hasTradeCard = gameState.playerCards.some(c => c.type === 'trade');
      return !hasTradeCard;
    }
    return true;
  });

  if (filteredCardTypes.length === 0) {
    return null;
  }

  const selectedCard = filteredCardTypes[Math.floor(Math.random() * filteredCardTypes.length)];
  selectedCard.id = Date.now() + Math.random();
  return selectedCard;
}

// --- Lógica de Interacción ---

function handlePlayerCardClick(card) {
  if (gameState.waitingForBoardSelection && gameState.selectedCard && gameState.selectedCard.id === card.id) {
    cancelAction();
    return;
  }

  const cardElement = event.currentTarget;

  if (card.type === 'bonus') {
    createCardUseEffect(cardElement);
    gameState.totalPoints += 50;
    gameState.playerCards = gameState.playerCards.filter(c => c.id !== card.id);
    saveCurrentPlayerState();
    updateStats();
    renderPlayerDeck();
    showToast('¡+50 puntos! 🌟');
    createSuccessParticles(cardElement);
    return;
  }

  if (card.type === 'trade') {
    if (gameState.totalPoints >= 20) {
      createCardUseEffect(cardElement);
      gameState.totalPoints -= 20;
      const newCard1 = generateRandomCard();
      const newCard2 = generateRandomCard();
      if (newCard1) gameState.playerCards.push(newCard1);
      if (newCard2) gameState.playerCards.push(newCard2);
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== card.id);
      saveCurrentPlayerState();
      updateStats();
      renderPlayerDeck();
      showToast('¡Intercambio realizado! -20 puntos, +2 cartas 💰');
    } else {
      showToast('⚠️ Necesitas al menos 20 puntos para usar Intercambio');
    }
    return;
  }

  if (card.type === 'magnify') {
    const player = getCurrentPlayer();
    let hiddenCards;

    if (gameMode === 'multiplayer' || gameMode === 'challenge') {
      hiddenCards = gameState.boardCards
        .map((card, index) => ({ card, index }))
        .filter(item => !item.card.removed && !player.peekingCards.includes(item.index));
    } else {
      const revealedIndices = [];
      if (gameState.peekingCardIndex !== null) {
        revealedIndices.push(gameState.peekingCardIndex);
      }
      if (gameState.magnifyRevealedCards) {
        revealedIndices.push(...gameState.magnifyRevealedCards);
      }
      hiddenCards = gameState.boardCards
        .map((card, index) => ({ card, index }))
        .filter(item => !item.card.removed && !revealedIndices.includes(item.index));
    }

    const cardsToReveal = Math.min(4, hiddenCards.length);
    if (cardsToReveal === 0) {
      showToast('⚠️ No hay cartas ocultas para revelar');
      return;
    }

    for (let i = 0; i < cardsToReveal; i++) {
      const randomIndex = Math.floor(Math.random() * hiddenCards.length);
      const cardToReveal = hiddenCards.splice(randomIndex, 1)[0];

      if (gameMode === 'multiplayer' || gameMode === 'challenge') {
        player.peekingCards.push(cardToReveal.index);
      } else {
        if (!gameState.magnifyRevealedCards) {
          gameState.magnifyRevealedCards = [];
        }
        gameState.magnifyRevealedCards.push(cardToReveal.index);
      }
    }

    gameState.playerCards = gameState.playerCards.filter(c => c.id !== card.id);
    saveCurrentPlayerState();
    renderPlayerDeck();
    renderBoard();
    showToast(`¡Lupa usada! 🔍 Reveladas ${cardsToReveal} cartas`);
    createMagnifyEffect();
    return;
  }

  if (card.type === 'extraTurn') {
    createCardUseEffect(cardElement);
    gameState.cardsPlayedThisTurn = Math.max(0, gameState.cardsPlayedThisTurn - 1);
    gameState.playerCards = gameState.playerCards.filter(c => c.id !== card.id);
    saveCurrentPlayerState();
    updateStats();
    renderPlayerDeck();
    showToast('¡Turno Extra! Puedes jugar una carta adicional ⚡');
    createSuccessParticles(cardElement);
    return;
  }

  if (card.type === 'megaReward') {
    createCardUseEffect(cardElement);
    gameState.megaRewardActive = true;
    gameState.selectedCard = null;
    gameState.waitingForBoardSelection = false;
    gameState.playerCards = gameState.playerCards.filter(c => c.id !== card.id);
    saveCurrentPlayerState();
    renderPlayerDeck();
    showToast('¡Mega Recompensa activada! 🎁 Responde bien y gana 4 cartas');
    createSuccessParticles(cardElement);
    return;
  }

  if (card.type === 'doublePoints') {
    createCardUseEffect(cardElement);
    gameState.doublePointsActive = true;
    gameState.selectedCard = null;
    gameState.waitingForBoardSelection = false;
    gameState.playerCards = gameState.playerCards.filter(c => c.id !== card.id);
    saveCurrentPlayerState();
    renderPlayerDeck();
    showToast('¡Duplicador activado! 💎 Tus próximos puntos se duplicarán');
    createSuccessParticles(cardElement);
    return;
  }

  if (card.type === 'answer') {
    gameState.selectedCard = card;
    gameState.waitingForBoardSelection = true;
    document.getElementById('cancelActionBtn').style.display = 'block';
    renderPlayerDeck();
    showToast('Selecciona una carta del tablero para ver su respuesta 💡');
    return;
  }

  if (card.type === 'steal') {
    if (gameMode === 'multiplayer' || gameMode === 'challenge') {
      showStealCardModal(card);
    }
    return;
  }

  if (card.type === 'sabotage') {
    if (gameMode === 'multiplayer' || gameMode === 'challenge') {
      showSabotageModal(card);
    }
    return;
  }

  // Para 'remove', 'peek', 'wildcard', 'change'
  gameState.selectedCard = card;
  gameState.waitingForBoardSelection = true;
  document.getElementById('cancelActionBtn').style.display = 'block';
  renderPlayerDeck();

  if (card.type === 'wildcard' || card.type === 'change') {
    showToast(`Selecciona una carta del tablero para usar ${card.name}`);
  } else {
    showToast(`Selecciona una carta del tablero para ${card.name.toLowerCase()}`);
  }
}

function handleBoardCardClick(index) {
  const card = gameState.boardCards[index];
  if (card.removed) return;

  if (gameState.cardsPlayedThisTurn >= 2) {
    showToast('⚠️ Ya jugaste 2 cartas este turno. Presiona "Terminar Turno"');
    return;
  }

  if (gameState.waitingForBoardSelection && gameState.selectedCard) {
    // Es una acción de carta especial
    if (gameState.selectedCard.type === 'remove') {
      card.removed = true;
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== gameState.selectedCard.id);
      showToast('Carta eliminada del tablero! 🗑️');
      cancelAction();
      renderBoard();
      renderPlayerDeck();
    } else if (gameState.selectedCard.type === 'peek') {
      gameState.peekingCardIndex = index;
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== gameState.selectedCard.id);
      showToast('¡Puedes ver esta carta! 👁️');
      cancelAction();
      renderBoard();
      renderPlayerDeck();
    } else if (gameState.selectedCard.type === 'wildcard') {
      const points = card.difficulty === 'easy' ? 10 : card.difficulty === 'medium' ? 20 : 30;
      gameState.totalPoints += points;
      gameState.correctAnswers++;
      gameState.boardCards[index].removed = true;
      gameState.cardsPlayedThisTurn++;
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== gameState.selectedCard.id);

      const newCard = generateRandomCard();
      if (newCard) {
        gameState.playerCards.push(newCard);
      }

      showToast(`¡Comodín usado! +${points} puntos 🃏`);
      createSuccessParticles();
      cancelAction();
      updateStats();
      renderBoard();
      renderPlayerDeck();
    } else if (gameState.selectedCard.type === 'change') {
      const currentDifficulty = card.difficulty;
      let newDifficulty = currentDifficulty;

      if (currentDifficulty === 'hard') {
        newDifficulty = 'medium';
      } else if (currentDifficulty === 'medium') {
        newDifficulty = 'easy';
      }

      const questionPool = questions[newDifficulty];
      const randomQuestion = questionPool[Math.floor(Math.random() * questionPool.length)];

      gameState.boardCards[index].difficulty = newDifficulty;
      gameState.boardCards[index].question = randomQuestion;
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== gameState.selectedCard.id);

      if (newDifficulty !== currentDifficulty) {
        showToast(`¡Dificultad reducida a ${newDifficulty === 'easy' ? 'Fácil' : 'Medio'}! 🔄`);
      } else {
        showToast('¡Pregunta cambiada! 🔄');
      }

      cancelAction();
      renderBoard();
      renderPlayerDeck();
    } else if (gameState.selectedCard.type === 'answer') {
      const correctAnswer = card.question.answers[card.question.correct];
      showToast(`💡 Respuesta correcta: "${correctAnswer}"`);

      gameState.playerCards = gameState.playerCards.filter(c => c.id !== gameState.selectedCard.id);

      const player = getCurrentPlayer();
      if (gameMode === 'multiplayer' || gameMode === 'challenge') {
        if (!player.peekingCards.includes(index)) {
          player.peekingCards.push(index);
        }
      } else {
        if (!gameState.magnifyRevealedCards) {
          gameState.magnifyRevealedCards = [];
        }
        if (!gameState.magnifyRevealedCards.includes(index)) {
          gameState.magnifyRevealedCards.push(index);
        }
      }

      cancelAction();
      renderBoard();
      renderPlayerDeck();
    }
  } else {
    // Es una selección de pregunta normal
    showQuestion(card, index);
  }
}

function showQuestion(card, cardIndex) {
  const modal = document.getElementById('questionModal');
  const content = document.getElementById('questionContent');

  const difficultyText = card.difficulty === 'easy' ? 'Fácil' : card.difficulty === 'medium' ? 'Desafiante' : 'Difícil';
  const difficultyClass = `difficulty-${card.difficulty}`;

  content.innerHTML = `
    <div class="question-difficulty ${difficultyClass}">${difficultyText}</div>
    <div class="question-text">${card.question.question}</div>
    <div class="answer-options" id="answerOptions"></div>
  `;

  const answersWithIndex = card.question.answers.map((answer, index) => ({ answer, originalIndex: index }));
  const shuffledAnswers = answersWithIndex.sort(() => Math.random() - 0.5);

  const optionsContainer = document.getElementById('answerOptions');
  shuffledAnswers.forEach(({ answer, originalIndex }) => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = answer;
    btn.addEventListener('click', () => checkAnswer(originalIndex, card, cardIndex, btn));
    optionsContainer.appendChild(btn);
  });

  modal.classList.add('active');
}

function checkAnswer(selectedIndex, card, cardIndex, btnElement) {
  const isCorrect = selectedIndex === card.question.correct;
  const allButtons = document.querySelectorAll('#answerOptions .answer-btn');

  allButtons.forEach((btn) => {
    btn.disabled = true;
  });

  // Encontrar el botón correcto para resaltarlo
  allButtons.forEach(btn => {
      if (btn.textContent === card.question.answers[card.question.correct]) {
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

    if (gameState.doublePointsActive) {
      points *= 2;
      gameState.doublePointsActive = false;
      resultDiv.textContent = `¡Correcto! +${points} puntos (DUPLICADOS 💎)`;
    } else {
      resultDiv.textContent = `¡Correcto! +${points} puntos`;
    }

    gameState.totalPoints += points;
    gameState.correctAnswers++;
    createSuccessParticles(btnElement);

    if (gameState.megaRewardActive) {
      for (let i = 0; i < 4; i++) {
        const newCard = generateRandomCard();
        if (newCard) gameState.playerCards.push(newCard);
      }
      gameState.megaRewardActive = false;
      resultDiv.textContent += ' ¡Ganaste 4 cartas especiales! 🎁';
    } else {
      const newCard = generateRandomCard();
      if (newCard) {
        gameState.playerCards.push(newCard);
        resultDiv.textContent += ' ¡Ganaste una carta especial!';
      }
    }
  } else {
    const correctAnswer = card.question.answers[card.question.correct];
    gameState.incorrectAnswers++;
    resultDiv.textContent = `¡Incorrecto! La respuesta correcta era: "${correctAnswer}"`;
    createErrorParticles(btnElement);

    gameState.doublePointsActive = false;
    gameState.megaRewardActive = false;

    if (gameState.playerCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * gameState.playerCards.length);
      gameState.playerCards.splice(randomIndex, 1);
      resultDiv.textContent += ' Pierdes una carta especial';
    }
  }

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

function cancelAction() {
  gameState.selectedCard = null;
  gameState.waitingForBoardSelection = false;
  document.getElementById('cancelActionBtn').style.display = 'none';
  renderPlayerDeck();
}

// --- Lógica de Fin de Turno / Juego ---

function checkAutoEndTurn() {
  const availableCards = gameState.boardCards.filter(c => !c.removed).length;
  const canPlayMore = gameState.cardsPlayedThisTurn < 2;

  if (availableCards === 0 || !canPlayMore) {
    setTimeout(() => {
      endTurn();
    }, 500);
  }
}

function endTurn() {
  const newCard = generateRandomCard();
  if (newCard) {
    gameState.playerCards.push(newCard);
    showToast('¡Ganaste una carta por terminar tu turno! 🎴');
  }

  gameState.doublePointsActive = false;
  gameState.megaRewardActive = false;
  saveCurrentPlayerState();

  if (gameMode === 'multiplayer' || gameMode === 'challenge') {
    nextPlayer();
    gameState.peekingCardIndex = null;
    gameState.cardsPlayedThisTurn = 0;
    gameState.doublePointsActive = false;
    gameState.megaRewardActive = false;
    updateStats();
    showToast(`Turno de ${getCurrentPlayer().name} 🎮`);

    if (currentPlayerIndex === 0) { // Se completó una ronda
      if (gameState.currentRound >= gameState.maxRounds) {
        endGame();
        return;
      }
      gameState.currentRound++;

      players.forEach(player => {
        player.boardCards = [];
        player.peekingCards = [];
      });

      initializeBoard();
      getCurrentPlayer().boardCards = [...gameState.boardCards];
      showToast(`¡Ronda ${gameState.currentRound}! 🎮`);
    }
  } else {
    // Modo un jugador
    if (gameState.currentRound >= gameState.maxRounds) {
      endGame();
      return;
    }

    gameState.currentRound++;
    gameState.peekingCardIndex = null;
    gameState.cardsPlayedThisTurn = 0;
    gameState.doublePointsActive = false;
    gameState.megaRewardActive = false;
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

    const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
    const rankingContainer = document.getElementById('playerRanking');
    rankingContainer.innerHTML = '';

    sortedPlayers.forEach((player, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
      const rankCard = document.createElement('div');
      rankCard.style.cssText = `
        background: ${index === 0 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
        color: white;
        padding: 20px;
        border-radius: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
      `;
      rankCard.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
          <span style="font-size: 32px;">${medal}</span>
          <div>
            <div style="font-size: 18px;">${player.name}</div>
            <div style="font-size: 14px; opacity: 0.9;">Aciertos: ${player.correct} | Errores: ${player.incorrect}</div>
          </div>
        </div>
        <div style="font-size: 28px;">${player.points} pts</div>
      `;
      rankingContainer.appendChild(rankCard);
    });
  }
}

function restartGame() {
  gameMode = 'single';
  players = [];
  currentPlayerIndex = 0;
  document.getElementById('currentPlayerTurn').style.display = 'none';
  showScreen('mode');
}

// --- Funciones Utilitarias (UI) ---

function updateStats() {
  document.getElementById('currentRound').textContent = gameState.currentRound;
  document.getElementById('totalPoints').textContent = gameState.totalPoints;
  document.getElementById('correctAnswers').textContent = gameState.correctAnswers;
  document.getElementById('incorrectAnswers').textContent = gameState.incorrectAnswers;
  document.getElementById('cardsPlayed').textContent = gameState.cardsPlayedThisTurn;
}

function showStealCardModal(stealCard) {
  const modal = document.getElementById('questionModal');
  const content = document.getElementById('questionContent');
  content.innerHTML = '<h3 style="color: #667eea; margin-bottom: 20px;">🎯 Robar Carta de un Jugador</h3>';

  players.forEach((player, index) => {
    if (index === currentPlayerIndex) return;

    const playerSection = document.createElement('div');
    playerSection.style.cssText = 'margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 12px;';
    playerSection.innerHTML = `
      <h4 style="color: #333; margin-bottom: 10px;">${player.name} - ${player.cards.length} cartas</h4>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;"></div>
    `;
    const cardsContainer = playerSection.querySelector('div');

    if (player.cards.length === 0) {
        cardsContainer.innerHTML = '<p style="font-size: 14px; color: #777;">Sin cartas para robar.</p>';
    } else {
        player.cards.forEach((card, cardIndex) => {
            const cardBtn = document.createElement('button');
            cardBtn.className = 'btn btn-primary';
            cardBtn.style.cssText = 'padding: 10px 15px; font-size: 14px;';
            cardBtn.textContent = `${card.icon} ${card.name}`;
            cardBtn.addEventListener('click', () => {
              const stolenCard = player.cards.splice(cardIndex, 1)[0];
              stolenCard.id = Date.now();
              gameState.playerCards.push(stolenCard);
              gameState.playerCards = gameState.playerCards.filter(c => c.id !== stealCard.id);
              saveCurrentPlayerState();
              modal.classList.remove('active');
              renderPlayerDeck();
              showToast(`¡Robaste ${stolenCard.name} de ${player.name}! 🎯`);
            });
            cardsContainer.appendChild(cardBtn);
        });
    }
    content.appendChild(playerSection);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.marginTop = '15px';
  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  content.appendChild(cancelBtn);
  modal.classList.add('active');
}

function showSabotageModal(sabotageCard) {
  const modal = document.getElementById('questionModal');
  const content = document.getElementById('questionContent');
  content.innerHTML = '<h3 style="color: #d63031; margin-bottom: 20px;">💣 Quitar Puntos a un Jugador</h3>';

  players.forEach((player, index) => {
    if (index === currentPlayerIndex) return;

    const playerBtn = document.createElement('button');
    playerBtn.className = 'btn btn-primary';
    playerBtn.style.cssText = 'width: 100%; padding: 15px; margin-bottom: 10px; font-size: 16px;';
    playerBtn.textContent = `${player.name} - ${player.points} puntos`;
    playerBtn.addEventListener('click', () => {
      player.points = Math.max(0, player.points - 30);
      gameState.playerCards = gameState.playerCards.filter(c => c.id !== sabotageCard.id);
      saveCurrentPlayerState();
      modal.classList.remove('active');
      renderPlayerDeck();
      showToast(`¡Le quitaste 30 puntos a ${player.name}! 💣`);
    });
    content.appendChild(playerBtn);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.style.marginTop = '15px';
  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
  });
  content.appendChild(cancelBtn);
  modal.classList.add('active');
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 15px 25px;
    border-radius: 12px;
    font-weight: bold;
    z-index: 2000;
    animation: slideIn 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  `;
  // Definir animaciones si no están en el CSS
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  `;
  document.head.appendChild(styleSheet);
  
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

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

function createMagnifyEffect() {
  const boardCards = document.querySelectorAll('.board-card.peeking');
  boardCards.forEach((card, index) => {
    setTimeout(() => {
      card.style.animation = 'revealGlow 0.6s ease-out, magnifyPulse 0.5s ease-out';
    }, index * 100);
  });
}

function createSuccessParticles(sourceElement) {
  const emojis = ['⭐', '✨', '🌟', '💫', '🎉', '🎊', '💥', '🏆'];
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
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '9999';
      const angle = (Math.random() * Math.PI * 2);
      const distance = Math.random() * 200 + 100;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      particle.style.setProperty('--tx', tx + 'px');
      particle.style.setProperty('--ty', ty + 'px');
      particle.style.animation = 'confettiExplosion 1.2s ease-out forwards';
      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 1200);
    }, i * 30);
  }

  const pointsText = document.createElement('div');
  pointsText.textContent = '🎯 ¡CORRECTO!';
  pointsText.style.cssText = `
    position: fixed; left: ${centerX}px; top: ${centerY}px;
    font-size: 32px; font-weight: bold; color: #00b894;
    text-shadow: 0 0 10px rgba(0, 184, 148, 0.8), 0 0 20px rgba(0, 206, 201, 0.6);
    pointer-events: none; z-index: 10000;
    animation: floatUp 1.5s ease-out forwards;
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(pointsText);
  setTimeout(() => pointsText.remove(), 1500);
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
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';
    const angle = (i / 12) * Math.PI * 2;
    const distance = Math.random() * 100 + 60;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    particle.style.setProperty('--tx', tx + 'px');
    particle.style.setProperty('--ty', ty + 'px');
    particle.style.animation = 'confettiExplosion 0.8s ease-out forwards';
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 800);
  }

  const errorText = document.createElement('div');
  errorText.textContent = '❌ INCORRECTO';
  errorText.style.cssText = `
    position: fixed; left: ${centerX}px; top: ${centerY}px;
    font-size: 28px; font-weight: bold; color: #d63031;
    text-shadow: 0 0 10px rgba(214, 48, 49, 0.8);
    pointer-events: none; z-index: 10000;
    animation: floatUp 1.2s ease-out forwards;
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(errorText);
  setTimeout(() => errorText.remove(), 1200);
}