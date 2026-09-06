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

  var DEFAULT_TARGETS_SEC = [1, 2, 3, 4, 5];
  var TARGETS_SEC = DEFAULT_TARGETS_SEC;
  var ROUNDS = DEFAULT_TARGETS_SEC.length;
  var MAX_TARGET_SEC = 60;
  var MAX_TARGETS = 20;
  var MODES = { solo: "solo", oneVOne: "1v1", twoVTwo: "2v2" };

  function trim(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeMode(mode) {
    if (mode === "solo" || mode === "1v1" || mode === "2v2") return mode;
    return "2v2";
  }

  function parseTargets(raw) {
    if (Array.isArray(raw)) {
      return raw.map(function (item) {
        return typeof item === "number" ? item : Number(trim(item));
      });
    }
    var text = trim(raw);
    if (!text) return [];
    return text.split(/[,，、\s]+/).filter(function (part) {
      return part !== "";
    }).map(function (part) {
      return Number(part);
    });
  }

  function validateTargets(targets) {
    if (!targets || !targets.length) {
      return "請至少設定 1 個目標秒數。";
    }
    if (targets.length > MAX_TARGETS) {
      return "目標最多 " + MAX_TARGETS + " 個。";
    }
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (typeof t !== "number" || !isFinite(t)) {
        return "目標秒數必須是數字，例如 1,2,3,4,5。";
      }
      if (t <= 0) {
        return "每個目標秒數必須大於 0。";
      }
      if (t > MAX_TARGET_SEC) {
        return "每個目標秒數不可超過 " + MAX_TARGET_SEC + " 秒。";
      }
    }
    return "";
  }

  function resolveTargets(raw) {
    if (raw == null) return DEFAULT_TARGETS_SEC.slice();
    return parseTargets(raw);
  }

  function targetsOf(state) {
    return state && state.targetsSec && state.targetsSec.length
      ? state.targetsSec
      : DEFAULT_TARGETS_SEC;
  }

  function roundsOf(state) {
    return targetsOf(state).length;
  }

  function setupTargetsRaw(setup) {
    if (!setup) return null;
    if (setup.targetsSec != null) return setup.targetsSec;
    if (setup.targets != null) return setup.targets;
    return null;
  }

  function createMatchup(setup) {
    setup = setup || {};
    var mode = normalizeMode(setup.mode);
    var targets = resolveTargets(setupTargetsRaw(setup));
    if (!targets.length) targets = DEFAULT_TARGETS_SEC.slice();

    var teams;
    if (mode === "solo") {
      var soloName =
        trim(setup.player) ||
        trim(setup.teamA && setup.teamA.players && setup.teamA.players[0]) ||
        "玩家";
      teams = [{ name: soloName, players: [soloName], rounds: [] }];
    } else if (mode === "1v1") {
      var p1 =
        trim(setup.players && setup.players[0]) ||
        trim(setup.teamA && setup.teamA.players && setup.teamA.players[0]) ||
        "玩家一";
      var p2 =
        trim(setup.players && setup.players[1]) ||
        trim(setup.teamB && setup.teamB.players && setup.teamB.players[0]) ||
        "玩家二";
      teams = [
        { name: p1, players: [p1], rounds: [] },
        { name: p2, players: [p2], rounds: [] },
      ];
    } else {
      var a = setup.teamA || {};
      var b = setup.teamB || {};
      teams = [
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
      ];
    }

    return {
      mode: mode,
      targetsSec: targets.slice(),
      matchupNumber: setup.matchupNumber ? setup.matchupNumber : 1,
      teams: teams,
      teamIndex: 0,
      roundIndex: 0,
    };
  }

  function currentTeam(state) {
    return state.teams[state.teamIndex];
  }

  function currentPlayerIndex(state) {
    if (state.mode === "2v2") return state.roundIndex % 2;
    return 0;
  }

  function currentPlayer(state) {
    return currentTeam(state).players[currentPlayerIndex(state)];
  }

  function currentTargetSec(state) {
    return targetsOf(state)[state.roundIndex];
  }

  function currentTargetMs(state) {
    return currentTargetSec(state) * 1000;
  }

  function isComplete(state) {
    var n = roundsOf(state);
    if (state.mode === "solo") {
      return state.teams[0].rounds.length === n;
    }
    return state.teams[0].rounds.length === n && state.teams[1].rounds.length === n;
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
    if (state.roundIndex < roundsOf(state) - 1) return { kind: "next-round" };
    if (state.mode === "solo") return { kind: "result" };
    if (state.teamIndex === 0) return { kind: "next-team" };
    return { kind: "result" };
  }

  /**
   * After a recorded stop: next teammate/round, other side, or matchup result.
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
    if (state.mode === "solo" || !state.teams[1]) return 0;
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
    var cs = Math.round(Number(targetSec) * 100);
    if (!isFinite(cs) || cs < 0) cs = 0;
    var s = Math.floor(cs / 100);
    var c = cs % 100;
    return s + ":" + pad2(c);
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

  function formatTargetLabel(sec) {
    var n = Number(sec);
    if (!isFinite(n)) return String(sec) + "s";
    if (Math.abs(n - Math.round(n)) < 1e-9) return Math.round(n) + "s";
    return String(n) + "s";
  }

  function modeLabel(mode) {
    var m = normalizeMode(mode);
    if (m === "solo") return "自己玩";
    if (m === "1v1") return "1v1";
    return "2v2";
  }

  function formatTargetsArrow(targets) {
    return (targets || []).map(function (sec) {
      var n = Number(sec);
      if (!isFinite(n)) return String(sec);
      if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
      return String(n);
    }).join("→");
  }

  /** Play-header confirmation line, e.g. "自己玩 · 2→3→4". */
  function formatMatchConfig(state) {
    return modeLabel(state && state.mode) + " · " + formatTargetsArrow(targetsOf(state));
  }

  function soloNameOf(setup) {
    return trim(setup && setup.player) ||
      trim(setup && setup.teamA && setup.teamA.players && setup.teamA.players[0]);
  }

  function oneVOneNames(setup) {
    return [
      trim(setup && setup.players && setup.players[0]) ||
        trim(setup && setup.teamA && setup.teamA.players && setup.teamA.players[0]),
      trim(setup && setup.players && setup.players[1]) ||
        trim(setup && setup.teamB && setup.teamB.players && setup.teamB.players[0]),
    ];
  }

  function validateSetup(setup) {
    var mode = normalizeMode(setup && setup.mode);
    var targetErr = validateTargets(resolveTargets(setupTargetsRaw(setup)));
    if (targetErr) return targetErr;

    if (mode === "solo") {
      if (!soloNameOf(setup)) return "請填寫玩家姓名。";
      return "";
    }

    if (mode === "1v1") {
      var pair = oneVOneNames(setup);
      if (!pair[0] || !pair[1]) return "請填寫兩位玩家姓名。";
      return "";
    }

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
    DEFAULT_TARGETS_SEC: DEFAULT_TARGETS_SEC,
    TARGETS_SEC: TARGETS_SEC,
    ROUNDS: ROUNDS,
    MAX_TARGET_SEC: MAX_TARGET_SEC,
    MAX_TARGETS: MAX_TARGETS,
    MODES: MODES,
    normalizeMode: normalizeMode,
    parseTargets: parseTargets,
    validateTargets: validateTargets,
    targetsOf: targetsOf,
    roundsOf: roundsOf,
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
    formatTargetLabel: formatTargetLabel,
    modeLabel: modeLabel,
    formatTargetsArrow: formatTargetsArrow,
    formatMatchConfig: formatMatchConfig,
    validateSetup: validateSetup,
  };
});
