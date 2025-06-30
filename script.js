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

let gameState = {
  players: [],
  currentPlayerIndex: 0,
  dice: [],
  selectedDice: [],
  selectedPair: null,
  hasRolled: false,
  completedTracks: new Set(),
  yellowEntries: {},
  entryCounter: 0,
};

const gridBoard = $("#gridBoard");
const trackLabels = $("#trackLabels");
const scoreDisplay = $("#scoreDisplay");
const turnIndicator = $("#turnIndicator");
const raceTracker = $("#raceTracker"); // new reference
const message = $("#message");
const winnerDiv = $("#winner");
const rollBtn = $("#rollDiceBtn");
const diceContainer = $("#diceContainer");
const comboDiv = $("#combinations");
const showCombosBtn = $("#showCombos");
const pairConfirmBtn = $("#confirmPair");
const restartBtn = $("#restartGame");

function makePlayer(name, color) {
  return { name, color, score: 0, positions: {} };
}

function startGame(mode) {
  gameState.players = [];
  if (mode === "2p") {
    gameState.players = [makePlayer("Red", "red"), makePlayer("Blue", "blue")];
  } else {
    gameState.players = [
      makePlayer("Red", "red"),
      makePlayer("Blue", "blue"),
      makePlayer("Green", "green"),
    ];
  }

  resetGameState();
  createTracks();
  updateUI();
  updateRaceTracker(); // initialize tracker

  $("#gridSection").removeClass("hidden");
  $("#rollDiceBtn").removeClass("hidden");
  $("#startGame").addClass("hidden");
  $("#restartGame").removeClass("hidden");
  $("#turnIndicator").removeClass("hidden");
}

function resetGameState() {
  gameState.currentPlayerIndex = 0;
  gameState.completedTracks = new Set();
  gameState.yellowEntries = {};
  gameState.entryCounter = 0;
  gameState.dice = [];
  gameState.selectedDice = [];
  gameState.selectedPair = null;
  gameState.hasRolled = false;
  updateRaceTracker(); // reset tracker
}

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
    $("#pointsLabels").append(`
      <div class="points-label">
        <div style="font-size: 12px;">1st: ${tracks[i].points}</div>
        <div style="font-size: 12px;">2nd: ${tracks[i].second}</div>
      </div>
    `);
  }
}

function updateUI() {
  const scores = gameState.players
    .map(p => `<span style="color:${p.color}">${p.name}: ${p.score} pts</span>`)
    .join(" | ");
  scoreDisplay.html(scores);

  const current = gameState.players[gameState.currentPlayerIndex];
  turnIndicator.text(`Current Turn: ${current.name} | Completed Tracks: ${gameState.completedTracks.size} / 6`);
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

function getPipLayout(val) {
  const dot = () => $("<div class='dot'></div>");
  const patterns = {
    1: [4], 2: [0, 8], 3: [0, 4, 8],
    4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8]
  };
  return Array.from({ length: 9 }, (_, i) =>
    patterns[val].includes(i) ? dot() : $("<div></div>")
  );
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
    gameState.selectedPair = [
      gameState.dice[i1] + gameState.dice[i2],
      gameState.dice[rest[0]] + gameState.dice[rest[1]],
    ];
    pairConfirmBtn.removeClass("hidden");
  } else {
    gameState.selectedPair = null;
    pairConfirmBtn.addClass("hidden");
  }

  renderDice();
}

function confirmMove() {
  const [sum1, sum2] = gameState.selectedPair;
  const player = gameState.players[gameState.currentPlayerIndex];
  if (!isTrackLocked(sum1, player)) moveToken(sum1, player);
  if (!isTrackLocked(sum2, player)) moveToken(sum2, player);
  gameState.hasRolled = false;
  gameState.selectedDice = [];
  gameState.selectedPair = null;
  diceContainer.empty();
  showCombosBtn.addClass("hidden");
  pairConfirmBtn.addClass("hidden");

  if (gameState.completedTracks.size >= 6) {
    finalizeScoring();
    return;
  }

  gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  updateUI();
}

function isTrackLocked(sum, player) {
  const maxStep = tracks[sum].white + tracks[sum].yellow;
  return player.positions[sum] >= maxStep;
}

function moveToken(sum, player) {
  const trackInfo = tracks[sum];
  if (!player.positions[sum]) player.positions[sum] = 0;
  const currentStep = player.positions[sum];
  const col = $(`.track-column[data-sum='${sum}']`);
  const cells = col.children();
  const lastStep = trackInfo.white + trackInfo.yellow - 1;

  if (currentStep > lastStep) return;

  col.find(`.token.${player.color}`).remove();
  const cell = $(cells[currentStep]);
  cell.append(`<div class='token ${player.color}'></div>`);
  player.positions[sum]++;

  const step = player.positions[sum] - 1;
  if (step >= trackInfo.white) {
    if (!gameState.yellowEntries[sum]) gameState.yellowEntries[sum] = [];
    const alreadyEntered = gameState.yellowEntries[sum].some(e => e.color === player.color);
    if (!alreadyEntered) {
      gameState.entryCounter++;
      gameState.yellowEntries[sum].push({
        color: player.color,
        step,
        order: gameState.entryCounter,
      });
      if (!gameState.completedTracks.has(sum)) {
        gameState.completedTracks.add(sum);
        updateRaceTracker(); // update tracker here
      }
    }
  }
}

function updateRaceTracker() {
  raceTracker.text(`Completed Tracks: ${gameState.completedTracks.size} / 6`);
}

function finalizeScoring() {
  for (let sum = 2; sum <= 12; sum++) {
    const entries = gameState.yellowEntries[sum];
    if (!entries || entries.length === 0) continue;
    const sorted = [...entries].sort((a, b) => b.order - a.order);
    if (sorted[0]) {
      const p1 = gameState.players.find(p => p.color === sorted[0].color);
      p1.score += tracks[sum].points;
    }
    if (sorted[1]) {
      const p2 = gameState.players.find(p => p.color === sorted[1].color);
      p2.score += tracks[sum].second;
    }
  }
  updateUI();
  winnerDiv.removeClass("hidden");
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
  winnerDiv.text(`${sortedPlayers[0].name} wins with ${sortedPlayers[0].score} points!`);
}

let selectedMode = null;

$("#dropdownButton").click(() => {
  $("#dropdownOptions").toggleClass("hidden");
});

$(".option").click(function () {
  const text = $(this).text();
  selectedMode = $(this).data("value");
  $("#dropdownButton").text(text);
  $("#dropdownOptions").addClass("hidden");
});

$("#startGame").click(() => {
  if (!selectedMode) {
    alert("Please select a mode first!");
    return;
  }
  startGame(selectedMode);
});

rollBtn.click(rollDice);
pairConfirmBtn.click(confirmMove);
showCombosBtn.hover(showCombinations);
restartBtn.click(() => location.reload());

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
