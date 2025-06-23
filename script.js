const tracks = {
  2: { white: 2, yellow: 2, points: 10, second: 6 },
  3: { white: 3, yellow: 2, points: 9, second: 5 },
  4: { white: 3, yellow: 3, points: 8, second: 4 },
  5: { white: 4, yellow: 3, points: 7, second: 4 },
  6: { white: 5, yellow: 3, points: 6, second: 3 },
  7: { white: 5, yellow: 3, points: 6, second: 3 },
  8: { white: 5, yellow: 3, points: 6, second: 3 },
  9: { white: 4, yellow: 3, points: 7, second: 4 },
  10: { white: 3, yellow: 3, points: 8, second: 4 },
  11: { white: 3, yellow: 2, points: 9, second: 5 },
  12: { white: 2, yellow: 2, points: 10, second: 6 },
};

const playerColors = ["red", "blue", "green"];
const gridBoard = $("#gridBoard");
const trackLabels = $("#trackLabels");
const scoreDisplay = $("#scoreDisplay");
const turnIndicator = $("#turnIndicator");
const message = $("#message");
const winnerDiv = $("#winner");
const rollBtn = $("#rollDiceBtn");
const diceContainer = $("#diceContainer");
const comboDiv = $("#combinations");
const showCombosBtn = $("#showCombos");
const pairConfirmBtn = $("#confirmPair");
const restartBtn = $("#restartGame");

let gameState = {
  players: [],
  currentPlayerIndex: 0,
  dice: [],
  selectedDice: [],
  selectedPair: null,
  hasRolled: false,
  trackClaims: {}, // { trackNum: [color1, color2, ...] }
  cellEntryOrder: {} // { trackNum: { stepIndex: [color1, color2] } }
};

function createTracks() {
  gridBoard.empty();
  trackLabels.empty();
  $("#pointsLabels").empty();
  for (let i = 2; i <= 12; i++) {
    const col = $(`<div class="track-column" data-sum="${i}"></div>`);
    const totalSteps = tracks[i].white + tracks[i].yellow;
    for (let j = 0; j < totalSteps; j++) {
      const cell = $(`<div class="track-cell"></div>`);
      if (j >= tracks[i].white) cell.addClass("finish");
      col.append(cell);
    }
    gridBoard.append(col);
    trackLabels.append(`<div>Track ${i}</div>`);

    // Points label above track
    $("#pointsLabels").append(`
      <div class="points-label">
        <div style="font-size: 12px;">1st: ${tracks[i].points}</div>
        <div style="font-size: 12px;">2nd: ${tracks[i].second}</div>
      </div>
    `);
  }
}

function startGame(mode) {
  gameState.players = [];
  if (mode === "2p") {
    gameState.players = [makePlayer("Red", "red"), makePlayer("Blue", "blue")];
  } else if (mode === "3p") {
    gameState.players = [makePlayer("Red", "red"), makePlayer("Blue", "blue"), makePlayer("Green", "green")];
  }
  gameState.currentPlayerIndex = 0;
  gameState.trackClaims = {};
  gameState.cellEntryOrder = {};
  createTracks();
  updateUI();
  updateRulesBox(mode);
}

function makePlayer(name, color) {
  return {
    name,
    color,
    score: 0,
    positions: {},
    finishes: {},
    finishOrder: []
  };
}

function updateUI() {
  const scores = gameState.players.map(p => `<span style="color:${p.color}">${p.name}: ${p.score} pts</span>`).join(" | ");
  scoreDisplay.html(scores);
  const current = gameState.players[gameState.currentPlayerIndex];
  turnIndicator.text(`Current Turn: ${current.name}`);
  turnIndicator.css("color", current.color);
}

function rollDice() {
  if (gameState.hasRolled) return;
  gameState.dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6 + 1));
  gameState.hasRolled = true;
  gameState.selectedDice = [];
  gameState.selectedPair = null;
  renderDice();
  showCombosBtn.removeClass("hidden");
  pairConfirmBtn.addClass("hidden");
}

function renderDice() {
  diceContainer.empty();
  gameState.dice.forEach((val, idx) => {
    const die = $(`<div class="dice"></div>`).click(() => selectDice(idx));
    if (gameState.selectedDice.includes(idx)) die.addClass("selected");
    getPipLayout(val).forEach(dot => die.append(dot));
    diceContainer.append(die);
  });
}

function selectDice(index) {
  if (!gameState.hasRolled) return;
  const sel = gameState.selectedDice;
  if (sel.includes(index)) {
    gameState.selectedDice = sel.filter(i => i !== index);
  } else if (sel.length < 2) {
    gameState.selectedDice.push(index);
  }
  if (gameState.selectedDice.length === 2) {
    const [i1, i2] = gameState.selectedDice;
    const rest = [0, 1, 2, 3].filter(i => ![i1, i2].includes(i));
    gameState.selectedPair = [gameState.dice[i1] + gameState.dice[i2], gameState.dice[rest[0]] + gameState.dice[rest[1]]];
    pairConfirmBtn.removeClass("hidden");
  } else {
    gameState.selectedPair = null;
    pairConfirmBtn.addClass("hidden");
  }
  renderDice();
}

function getPipLayout(val) {
  const dot = () => $("<div class='dot'></div>");
  const patterns = {
    1: [4], 2: [0, 8], 3: [0, 4, 8],
    4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
  };
  return Array.from({ length: 9 }, (_, i) => patterns[val].includes(i) ? dot() : $("<div></div>"));
}

function confirmMove() {
  const [sum1, sum2] = gameState.selectedPair;
  const player = gameState.players[gameState.currentPlayerIndex];
  moveToken(sum1, player);
  moveToken(sum2, player);
  gameState.hasRolled = false;
  gameState.selectedDice = [];
  gameState.selectedPair = null;
  diceContainer.empty();
  showCombosBtn.addClass("hidden");
  pairConfirmBtn.addClass("hidden");
  nextTurn();
}

function moveToken(sum, player) {
  if (!player.positions[sum]) player.positions[sum] = 0;
  const steps = player.positions[sum];
  const col = $(`.track-column[data-sum='${sum}']`);
  const cells = col.children();
  col.find(`.token.${player.color}`).remove();
  if (steps >= tracks[sum].white + tracks[sum].yellow) return;

  const cell = $(cells[steps]);
  cell.append(`<div class='token ${player.color}'></div>`);
  player.positions[sum]++;

  // Record entry order into yellow cells
  const stepIndex = steps;
  const isYellow = stepIndex >= tracks[sum].white;
  if (isYellow) {
    if (!gameState.cellEntryOrder[sum]) gameState.cellEntryOrder[sum] = {};
    if (!gameState.cellEntryOrder[sum][stepIndex]) gameState.cellEntryOrder[sum][stepIndex] = [];

    const entryList = gameState.cellEntryOrder[sum][stepIndex];
    if (!entryList.includes(player.color)) entryList.push(player.color);

    // Last yellow cell
    if (stepIndex === tracks[sum].white + tracks[sum].yellow - 1) {
      const entry = gameState.cellEntryOrder[sum][stepIndex];
      if (entry.length === 1) {
        player.score += tracks[sum].second;
        message.text(`${player.name} scored ${tracks[sum].second} pts as second to reach last cell of Track ${sum}`);
      } else if (entry.length === 2) {
        player.score += tracks[sum].points;
        message.text(`${player.name} scored ${tracks[sum].points} pts as first to reach last cell of Track ${sum}`);
      }
    }
  } else {
    message.text(`${player.name} moved to step ${steps + 1} in Track ${sum}`);
  }

  updateUI();
}

function nextTurn() {
  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  updateUI();
}

function showCombinations() {
  const pairs = getUniquePairs(gameState.dice);
  comboDiv.html(pairs.map(p => `${p[0]} & ${p[1]}`).join("<br>"));
  comboDiv.toggleClass("hidden");
}

function getUniquePairs(dice) {
  const results = [];
  const used = new Set();
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const sum1 = dice[i] + dice[j];
      const rest = [0, 1, 2, 3].filter(k => k !== i && k !== j);
      const sum2 = dice[rest[0]] + dice[rest[1]];
      const key = [sum1, sum2].sort().join("-");
      if (!used.has(key)) {
        used.add(key);
        results.push([sum1, sum2]);
      }
    }
  }
  return results;
}

function updateRulesBox(mode) {
  const rulesList = $("#rulesContent");
  rulesList.empty();

  if (mode === "2p") {
    rulesList.append("<li>First player to enter yellow steps gets reduced points.</li>");
    rulesList.append("<li>Second player to enter the same yellow step gets full points.</li>");
    rulesList.append("<li>If both land on same yellow cell, later arrival gets full points.</li>");
  } else if (mode === "3p") {
    rulesList.append("<li>Only first 2 players on yellow steps score points.</li>");
    rulesList.append("<li>Second to reach a cell gets full points; first gets reduced.</li>");
    rulesList.append("<li>Third to reach same yellow cell gets no points.</li>");
  }
}

$("#startGame").click(() => {
  const mode = $("#mode").val();
  startGame(mode);
  rollBtn.removeClass("hidden");
  $("#startGame").addClass("hidden");
  restartBtn.removeClass("hidden");
});

rollBtn.click(rollDice);
pairConfirmBtn.click(confirmMove);
showCombosBtn.click(showCombinations);
restartBtn.click(() => location.reload());
