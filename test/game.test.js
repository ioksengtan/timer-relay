"use strict";

var assert = require("assert");
var G = require("../js/game.js");

function setup() {
  return G.createMatchup({
    teamA: { name: "紅隊", players: ["小明", "小華"] },
    teamB: { name: "藍隊", players: ["小美", "小強"] },
  });
}

function playStop(state, stoppedMs) {
  var entry = G.recordStop(state, stoppedMs);
  var next = G.advance(state);
  return { entry: entry, next: next };
}

// --- turn order ---
(function testTeammatesAlternateThenOtherTeam() {
  var state = setup();
  var sequence = [];
  while (!G.isComplete(state)) {
    sequence.push({
      team: G.currentTeam(state).name,
      player: G.currentPlayer(state),
      round: state.roundIndex + 1,
      target: G.currentTargetSec(state),
    });
    playStop(state, G.currentTargetMs(state));
  }
  assert.strictEqual(sequence.length, 10);
  assert.deepStrictEqual(
    sequence.map(function (s) { return s.team + ":" + s.player + ":" + s.round + ":" + s.target; }),
    [
      "紅隊:小明:1:1",
      "紅隊:小華:2:2",
      "紅隊:小明:3:3",
      "紅隊:小華:4:4",
      "紅隊:小明:5:5",
      "藍隊:小美:1:1",
      "藍隊:小強:2:2",
      "藍隊:小美:3:3",
      "藍隊:小強:4:4",
      "藍隊:小美:5:5",
    ]
  );
  var afterFifthA = setup();
  for (var i = 0; i < 4; i++) playStop(afterFifthA, 1000);
  var lastA = playStop(afterFifthA, 1000);
  assert.strictEqual(lastA.next.kind, "next-team");
  var peekState = setup();
  G.recordStop(peekState, 1000);
  assert.strictEqual(G.peekAdvance(peekState).kind, "next-round");
  assert.strictEqual(peekState.roundIndex, 0);
  var afterFifthB = afterFifthA;
  for (var j = 0; j < 4; j++) playStop(afterFifthB, 1000);
  var lastB = playStop(afterFifthB, 1000);
  assert.strictEqual(lastB.next.kind, "result");
  console.log("ok teammates alternate, team A then team B");
})();

(function testErrorIsAbsoluteDifferenceInCentiseconds() {
  var early = G.scoreStop(980, 1000);
  assert.strictEqual(early.errorCs, 2);
  var late = G.scoreStop(1120, 1000);
  assert.strictEqual(late.errorCs, 12);
  var exact = G.scoreStop(2000, 2000);
  assert.strictEqual(exact.errorCs, 0);
  console.log("ok error = |stopped − target| in hundredths");
})();

(function testWinnerLowerTotal() {
  var state = setup();
  // A slightly late each round; B exact
  for (var i = 0; i < 5; i++) playStop(state, G.currentTargetMs(state) + 30);
  for (var j = 0; j < 5; j++) playStop(state, G.currentTargetMs(state));
  assert.strictEqual(G.teamTotalCs(state.teams[0]), 15);
  assert.strictEqual(G.teamTotalCs(state.teams[1]), 0);
  assert.strictEqual(G.winnerIndex(state), 1);
  console.log("ok lower cumulative error wins");
})();

(function testTie() {
  var state = setup();
  for (var i = 0; i < 10; i++) playStop(state, G.currentTargetMs(state) + 50);
  assert.strictEqual(G.winnerIndex(state), -1);
  console.log("ok equal totals are a tie");
})();

(function testFormats() {
  assert.strictEqual(G.formatLed(1280), "00:01:28");
  assert.strictEqual(G.formatLed(0), "00:00:00");
  assert.strictEqual(G.formatLed(2000), "00:02:00");
  assert.strictEqual(G.formatGoal(2), "2:00");
  assert.strictEqual(G.formatDiff(2), ":02");
  assert.strictEqual(G.formatDiff(123), "1:23");
  assert.strictEqual(G.formatSeconds(142), "1.42");
  console.log("ok LED / goal / difference formats");
})();

(function testValidateSetup() {
  assert.ok(G.validateSetup({ teamA: { name: "", players: ["a", "b"] }, teamB: { name: "x", players: ["c", "d"] } }));
  assert.strictEqual(
    G.validateSetup({
      teamA: { name: "甲", players: ["一", "二"] },
      teamB: { name: "乙", players: ["三", "四"] },
    }),
    ""
  );
  console.log("ok setup validation");
})();

console.log("\nAll game rule tests passed.");
