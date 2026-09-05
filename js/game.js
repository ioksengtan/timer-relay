/**
 * Timer Stop Challenge / 計時停錶挑戰 — pure game rules.
 * Works in the browser and in Node (for tests).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.TimerRelay = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TARGETS_SEC = [1, 2, 3, 4, 5];
  var ROUNDS = TARGETS_SEC.length;

  function trim(value) {
    return String(value == null ? "" : value).trim();
  }

  function createMatchup(setup) {
    var a = setup && setup.teamA ? setup.teamA : {};
    var b = setup && setup.teamB ? setup.teamB : {};
    return {
      matchupNumber: setup && setup.matchupNumber ? setup.matchupNumber : 1,
      teams: [
        {
          name: trim(a.name) || "甲隊",
          players: [trim(a.players && a.players[0]) || "球員一", trim(a.players && a.players[1]) || "球員二"],
          rounds: [],
        },
        {
          name: trim(b.name) || "乙隊",
          players: [trim(b.players && b.players[0]) || "球員三", trim(b.players && b.players[1]) || "球員四"],
          rounds: [],
        },
      ],
      teamIndex: 0,
      roundIndex: 0,
    };
  }

  function currentTeam(state) {
    return state.teams[state.teamIndex];
  }

  function currentPlayerIndex(state) {
    return state.roundIndex % 2;
  }

  function currentPlayer(state) {
    return currentTeam(state).players[currentPlayerIndex(state)];
  }

  function currentTargetSec(state) {
    return TARGETS_SEC[state.roundIndex];
  }

  function currentTargetMs(state) {
    return currentTargetSec(state) * 1000;
  }

  function isComplete(state) {
    return state.teams[0].rounds.length === ROUNDS && state.teams[1].rounds.length === ROUNDS;
  }

  /**
   * Score in whole centiseconds so the LED (hundredths) and totals stay aligned.
   */
  function scoreStop(stoppedMs, targetMs) {
    var stoppedCs = Math.round(stoppedMs / 10);
    var targetCs = Math.round(targetMs / 10);
    var errorCs = Math.abs(stoppedCs - targetCs);
    return {
      stoppedMs: stoppedMs,
      stoppedCs: stoppedCs,
      targetMs: targetMs,
      targetCs: targetCs,
      errorCs: errorCs,
    };
  }

  function recordStop(state, stoppedMs) {
    if (isComplete(state)) {
      throw new Error("matchup already complete");
    }
    var scored = scoreStop(stoppedMs, currentTargetMs(state));
    var entry = {
      round: state.roundIndex + 1,
      targetSec: currentTargetSec(state),
      player: currentPlayer(state),
      playerIndex: currentPlayerIndex(state),
      stoppedMs: scored.stoppedMs,
      stoppedCs: scored.stoppedCs,
      errorCs: scored.errorCs,
    };
    currentTeam(state).rounds.push(entry);
    return entry;
  }

  /**
   * What happens after the current recorded stop, without mutating state.
   * Returns { kind: "next-round" | "next-team" | "result" }
   */
  function peekAdvance(state) {
    if (state.teams[state.teamIndex].rounds.length !== state.roundIndex + 1) {
      throw new Error("cannot advance before recording the current stop");
    }
    if (state.roundIndex < ROUNDS - 1) return { kind: "next-round" };
    if (state.teamIndex === 0) return { kind: "next-team" };
    return { kind: "result" };
  }

  /**
   * After a recorded stop: next teammate/round, other team, or matchup result.
   */
  function advance(state) {
    var next = peekAdvance(state);
    if (next.kind === "next-round") {
      state.roundIndex += 1;
    } else if (next.kind === "next-team") {
      state.teamIndex = 1;
      state.roundIndex = 0;
    }
    return next;
  }

  function teamTotalCs(team) {
    return team.rounds.reduce(function (sum, round) {
      return sum + round.errorCs;
    }, 0);
  }

  function winnerIndex(state) {
    var a = teamTotalCs(state.teams[0]);
    var b = teamTotalCs(state.teams[1]);
    if (a < b) return 0;
    if (b < a) return 1;
    return -1;
  }

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  /** Split a millisecond duration into MM, SS, CC for the LED. */
  function splitLed(ms) {
    var cs = Math.max(0, Math.round(ms / 10));
    var cc = cs % 100;
    var totalSec = Math.floor(cs / 100);
    var ss = totalSec % 60;
    var mm = Math.floor(totalSec / 60);
    if (mm > 99) mm = 99;
    return { mm: mm, ss: ss, cc: cc };
  }

  function formatLed(ms) {
    var p = splitLed(ms);
    return pad2(p.mm) + ":" + pad2(p.ss) + ":" + pad2(p.cc);
  }

  /** Goal overlay, e.g. 2s → "2:00" (seconds : hundredths). */
  function formatGoal(targetSec) {
    return targetSec + ":00";
  }

  /** Difference overlay: ":02" under 1s, otherwise "1:23". */
  function formatDiff(errorCs) {
    var cs = Math.max(0, Math.round(errorCs));
    if (cs < 100) return ":" + pad2(cs);
    var s = Math.floor(cs / 100);
    var c = cs % 100;
    return s + ":" + pad2(c);
  }

  function formatSeconds(cs) {
    return (Math.max(0, cs) / 100).toFixed(2);
  }

  function validateSetup(setup) {
    var a = setup && setup.teamA ? setup.teamA : {};
    var b = setup && setup.teamB ? setup.teamB : {};
    var names = [
      trim(a.name),
      trim(a.players && a.players[0]),
      trim(a.players && a.players[1]),
      trim(b.name),
      trim(b.players && b.players[0]),
      trim(b.players && b.players[1]),
    ];
    if (names.some(function (n) { return !n; })) {
      return "請填寫兩隊隊名與四位球員姓名。";
    }
    return "";
  }

  return {
    TARGETS_SEC: TARGETS_SEC,
    ROUNDS: ROUNDS,
    createMatchup: createMatchup,
    currentTeam: currentTeam,
    currentPlayer: currentPlayer,
    currentPlayerIndex: currentPlayerIndex,
    currentTargetSec: currentTargetSec,
    currentTargetMs: currentTargetMs,
    isComplete: isComplete,
    scoreStop: scoreStop,
    recordStop: recordStop,
    peekAdvance: peekAdvance,
    advance: advance,
    teamTotalCs: teamTotalCs,
    winnerIndex: winnerIndex,
    splitLed: splitLed,
    formatLed: formatLed,
    formatGoal: formatGoal,
    formatDiff: formatDiff,
    formatSeconds: formatSeconds,
    validateSetup: validateSetup,
  };
});
