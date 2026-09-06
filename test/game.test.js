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

function collectSequence(state) {
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
  return sequence;
}

// --- turn order ---
(function testTeammatesAlternateThenOtherTeam() {
  var state = setup();
  var sequence = collectSequence(state);
  assert.strictEqual(state.mode, "2v2");
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
  assert.strictEqual(G.formatGoal(1.5), "1:50");
  assert.strictEqual(G.formatDiff(2), ":02");
  assert.strictEqual(G.formatDiff(123), "1:23");
  assert.strictEqual(G.formatSeconds(142), "1.42");
  assert.strictEqual(G.formatTargetLabel(5), "5s");
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

(function testSoloPlaysEachTargetOnce() {
  var state = G.createMatchup({
    mode: "solo",
    player: "小明",
    targetsSec: [1, 2, 3, 4, 5],
  });
  var sequence = collectSequence(state);
  assert.strictEqual(state.teams.length, 1);
  assert.deepStrictEqual(
    sequence.map(function (s) { return s.player + ":" + s.round + ":" + s.target; }),
    ["小明:1:1", "小明:2:2", "小明:3:3", "小明:4:4", "小明:5:5"]
  );
  assert.strictEqual(G.isComplete(state), true);
  assert.strictEqual(G.teamTotalCs(state.teams[0]), 0);
  var last = G.createMatchup({ mode: "solo", player: "小明" });
  for (var i = 0; i < 4; i++) playStop(last, G.currentTargetMs(last));
  var done = playStop(last, G.currentTargetMs(last));
  assert.strictEqual(done.next.kind, "result");
  console.log("ok solo plays the full sequence once");
})();

(function testOneVOnePlayerAThenPlayerB() {
  var state = G.createMatchup({
    mode: "1v1",
    players: ["小明", "小美"],
  });
  var sequence = collectSequence(state);
  assert.deepStrictEqual(
    sequence.map(function (s) { return s.team + ":" + s.player + ":" + s.round + ":" + s.target; }),
    [
      "小明:小明:1:1",
      "小明:小明:2:2",
      "小明:小明:3:3",
      "小明:小明:4:4",
      "小明:小明:5:5",
      "小美:小美:1:1",
      "小美:小美:2:2",
      "小美:小美:3:3",
      "小美:小美:4:4",
      "小美:小美:5:5",
    ]
  );
  var mid = G.createMatchup({ mode: "1v1", players: ["A", "B"] });
  for (var i = 0; i < 4; i++) playStop(mid, G.currentTargetMs(mid));
  var afterA = playStop(mid, G.currentTargetMs(mid));
  assert.strictEqual(afterA.next.kind, "next-team");
  assert.strictEqual(G.currentPlayer(mid), "B");
  console.log("ok 1v1 is player A all targets then player B");
})();

(function testCustomTargetsDriveRoundsAndGoal() {
  var targets = [2, 4, 6];
  var duo = G.createMatchup({
    mode: "2v2",
    teamA: { name: "紅隊", players: ["小明", "小華"] },
    teamB: { name: "藍隊", players: ["小美", "小強"] },
    targetsSec: targets,
  });
  assert.deepStrictEqual(G.targetsOf(duo), targets);
  assert.strictEqual(G.roundsOf(duo), 3);
  assert.strictEqual(G.currentTargetSec(duo), 2);
  assert.strictEqual(G.currentTargetMs(duo), 2000);
  assert.strictEqual(G.formatGoal(G.currentTargetSec(duo)), "2:00");
  var sequence = collectSequence(duo);
  assert.deepStrictEqual(
    sequence.map(function (s) { return s.team + ":" + s.player + ":" + s.target; }),
    ["紅隊:小明:2", "紅隊:小華:4", "紅隊:小明:6", "藍隊:小美:2", "藍隊:小強:4", "藍隊:小美:6"]
  );

  var solo = G.createMatchup({ mode: "solo", player: "小明", targetsSec: "1.5, 3" });
  assert.deepStrictEqual(G.targetsOf(solo), [1.5, 3]);
  assert.strictEqual(G.formatGoal(G.currentTargetSec(solo)), "1:50");
  playStop(solo, 1500);
  assert.strictEqual(G.currentTargetSec(solo), 3);
  var last = playStop(solo, 3010);
  assert.strictEqual(last.entry.errorCs, 1);
  assert.strictEqual(last.next.kind, "result");
  console.log("ok custom targets drive sequence, LED goal, and scoring");
})();

(function testParseAndValidateTargets() {
  assert.deepStrictEqual(G.parseTargets("1,2,3,4,5"), [1, 2, 3, 4, 5]);
  assert.deepStrictEqual(G.parseTargets("1，2、3 4"), [1, 2, 3, 4]);
  assert.strictEqual(G.validateTargets([1, 2, 3, 4, 5]), "");
  assert.strictEqual(G.validateTargets([]), "請至少設定 1 個目標秒數。");
  assert.strictEqual(G.validateTargets([0]), "每個目標秒數必須大於 0。");
  assert.strictEqual(G.validateTargets([-1]), "每個目標秒數必須大於 0。");
  assert.strictEqual(G.validateTargets([61]), "每個目標秒數不可超過 60 秒。");
  assert.ok(G.validateTargets(new Array(21).fill(1)).indexOf("20") !== -1);
  assert.ok(G.validateTargets([1, NaN]).indexOf("數字") !== -1);
  assert.strictEqual(G.validateSetup({ mode: "solo", player: "小明", targetsSec: "" }), "請至少設定 1 個目標秒數。");
  assert.strictEqual(G.validateSetup({ mode: "solo", player: "", targetsSec: [1] }), "請填寫玩家姓名。");
  assert.strictEqual(G.validateSetup({ mode: "1v1", players: ["小明", ""], targetsSec: [1] }), "請填寫兩位玩家姓名。");
  assert.strictEqual(G.validateSetup({ mode: "solo", player: "小明", targetsSec: [1] }), "");
  assert.strictEqual(G.validateSetup({ mode: "1v1", players: ["小明", "小美"], targetsSec: [2, 4] }), "");
  console.log("ok target parsing and mode-aware setup validation");
})();

console.log("\nAll game rule tests passed.");
