(function () {
  "use strict";

  var G = window.TimerRelay;
  var SEGMENTS = ["a", "b", "c", "d", "e", "f", "g"];

  var screens = {
    setup: document.getElementById("screen-setup"),
    play: document.getElementById("screen-play"),
    result: document.getElementById("screen-result"),
  };

  var els = {
    form: document.getElementById("setup-form"),
    setupError: document.getElementById("setup-error"),
    setupRules: document.getElementById("setup-rules"),
    setupSubmit: document.getElementById("setup-submit"),
    modeInputs: document.querySelectorAll('input[name="mode"]'),
    setupSolo: document.getElementById("setup-solo"),
    setup1v1: document.getElementById("setup-1v1"),
    setup2v2: document.getElementById("setup-2v2"),
    soloName: document.getElementById("solo-name"),
    pvpA: document.getElementById("pvp-a"),
    pvpB: document.getElementById("pvp-b"),
    teamAName: document.getElementById("team-a-name"),
    teamAP1: document.getElementById("team-a-p1"),
    teamAP2: document.getElementById("team-a-p2"),
    teamBName: document.getElementById("team-b-name"),
    teamBP1: document.getElementById("team-b-p1"),
    teamBP2: document.getElementById("team-b-p2"),
    targetsInput: document.getElementById("targets-input"),
    targetsPreview: document.getElementById("targets-preview"),
    matchupMeta: document.getElementById("matchup-meta"),
    turnName: document.getElementById("turn-name"),
    roundMeta: document.getElementById("round-meta"),
    totals: document.getElementById("totals"),
    chipA: document.getElementById("chip-a"),
    chipB: document.getElementById("chip-b"),
    chipAName: document.getElementById("chip-a-name"),
    chipBName: document.getElementById("chip-b-name"),
    chipATotal: document.getElementById("chip-a-total"),
    chipBTotal: document.getElementById("chip-b-total"),
    diffCard: document.getElementById("diff-card"),
    diffLed: document.getElementById("diff-led"),
    mainLed: document.getElementById("main-led"),
    goalOverlay: document.getElementById("goal-overlay"),
    statusLine: document.getElementById("status-line"),
    stopBtn: document.getElementById("stop-btn"),
    continueBtn: document.getElementById("continue-btn"),
    playHint: document.getElementById("play-hint"),
    resultTitle: document.getElementById("result-title"),
    resultSub: document.getElementById("result-sub"),
    scoreGrid: document.getElementById("score-grid"),
    scoreA: document.getElementById("score-a"),
    scoreB: document.getElementById("score-b"),
    scoreAName: document.getElementById("score-a-name"),
    scoreBName: document.getElementById("score-b-name"),
    scoreASum: document.getElementById("score-a-sum"),
    scoreBSum: document.getElementById("score-b-sum"),
    thA: document.getElementById("th-a"),
    thB: document.getElementById("th-b"),
    roundBody: document.getElementById("round-body"),
    nextMatchupBtn: document.getElementById("next-matchup-btn"),
    editNamesBtn: document.getElementById("edit-names-btn"),
    playConfig: document.getElementById("play-config"),
    modeOptions: document.querySelector(".mode-options"),
  };

  var matchupNumber = 1;
  var state = null;
  var phase = "setup"; // setup | ready | running | stopped | result
  var lastAdvance = null;
  var startTs = 0;
  var elapsedMs = 0;
  var lastStopAt = 0;
  var selectedMode = "2v2";

  function showScreen(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].classList.toggle("is-active", key === name);
    });
  }

  function closestModeOption(el) {
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains("mode-option")) return el;
      el = el.parentElement;
    }
    return null;
  }

  function currentMode() {
    var checked = document.querySelector('input[name="mode"]:checked');
    if (checked) {
      selectedMode = G.normalizeMode(checked.value);
      return selectedMode;
    }
    return G.normalizeMode(selectedMode);
  }

  function selectMode(mode) {
    selectedMode = G.normalizeMode(mode);
    Array.prototype.forEach.call(els.modeInputs, function (input) {
      input.checked = input.value === selectedMode;
    });
    els.setupError.textContent = "";
    updateModeUi();
  }

  function makeDigit() {
    var el = document.createElement("div");
    el.className = "digit";
    el.setAttribute("data-n", "blank");
    SEGMENTS.forEach(function (name) {
      var seg = document.createElement("span");
      seg.className = "seg " + name;
      el.appendChild(seg);
    });
    return el;
  }

  function makeColon() {
    var el = document.createElement("div");
    el.className = "colon";
    el.innerHTML = "<i></i><i></i>";
    return el;
  }

  function buildLed(container, digitCount, colonAfter) {
    container.innerHTML = "";
    var digits = [];
    for (var i = 0; i < digitCount; i++) {
      var d = makeDigit();
      container.appendChild(d);
      digits.push(d);
      if (colonAfter && colonAfter.indexOf(i) !== -1) {
        container.appendChild(makeColon());
      }
    }
    return digits;
  }

  var mainDigits = buildLed(els.mainLed, 6, [1, 3]);
  var diffDigits = [];

  function setDigit(el, n) {
    if (n == null || n === "") {
      el.setAttribute("data-n", "blank");
      return;
    }
    el.setAttribute("data-n", String(n));
  }

  function renderMainLed(ms) {
    var p = G.splitLed(ms);
    var chars = [Math.floor(p.mm / 10), p.mm % 10, Math.floor(p.ss / 10), p.ss % 10, Math.floor(p.cc / 10), p.cc % 10];
    chars.forEach(function (n, i) {
      setDigit(mainDigits[i], n);
    });
    els.mainLed.setAttribute("aria-label", "秒錶 " + G.formatLed(ms));
  }

  function blankMainLed() {
    mainDigits.forEach(function (d) {
      setDigit(d, null);
    });
    els.mainLed.setAttribute("aria-label", "秒錶計時中，數字隱藏");
  }

  function renderDiffLed(errorCs) {
    els.diffLed.innerHTML = "";
    diffDigits = [];
    var text = G.formatDiff(errorCs);
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === ":") {
        els.diffLed.appendChild(makeColon());
      } else {
        var d = makeDigit();
        setDigit(d, ch);
        els.diffLed.appendChild(d);
        diffDigits.push(d);
      }
    }
  }

  function readSetup() {
    var mode = currentMode();
    var setup = {
      matchupNumber: matchupNumber,
      mode: mode,
      targetsSec: els.targetsInput.value,
    };
    if (mode === "solo") {
      setup.player = els.soloName.value;
      return setup;
    }
    if (mode === "1v1") {
      setup.players = [els.pvpA.value, els.pvpB.value];
      return setup;
    }
    setup.teamA = {
      name: els.teamAName.value,
      players: [els.teamAP1.value, els.teamAP2.value],
    };
    setup.teamB = {
      name: els.teamBName.value,
      players: [els.teamBP1.value, els.teamBP2.value],
    };
    return setup;
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
  }

  function teamTotalLabel(team) {
    if (!team.rounds.length) return "—";
    return G.formatSeconds(G.teamTotalCs(team)) + " 秒";
  }

  function updateModeUi() {
    var mode = currentMode();
    els.setupSolo.hidden = mode !== "solo";
    els.setup1v1.hidden = mode !== "1v1";
    els.setup2v2.hidden = mode !== "2v2";
    Array.prototype.forEach.call(els.modeInputs, function (input) {
      input.parentElement.classList.toggle("is-selected", input.checked);
    });
    if (mode === "solo") {
      els.setupRules.textContent = "自己挑戰完整目標序列各停一次，累計絕對誤差為本局成績。沒有對手。";
      els.setupSubmit.textContent = "開始挑戰";
    } else if (mode === "1v1") {
      els.setupRules.textContent = "兩人對戰：玩家 A 先打完整個目標序列，再換玩家 B。誤差取絕對值加總，較低者勝。";
      els.setupSubmit.textContent = "開始對戰";
    } else {
      els.setupRules.textContent = "兩隊各 2 人輪流停錶，各打完整個目標序列。誤差取絕對值加總，較低者勝。先打完甲隊，再打乙隊。";
      els.setupSubmit.textContent = "開始對戰";
    }
  }

  function updateTargetsPreview() {
    var parsed = G.parseTargets(els.targetsInput.value);
    var err = G.validateTargets(parsed);
    if (err) {
      els.targetsPreview.textContent = "";
      return;
    }
    els.targetsPreview.textContent = parsed.join(" → ") + " 秒";
  }

  function renderPlayChrome() {
    var team = G.currentTeam(state);
    var a = state.teams[0];
    var rounds = G.roundsOf(state);
    var solo = state.mode === "solo";
    els.matchupMeta.textContent = solo
      ? "第 " + state.matchupNumber + " 局 · " + a.name
      : "第 " + state.matchupNumber + " 組 · " + team.name;
    els.turnName.textContent = solo ? a.name : "輪到 " + G.currentPlayer(state);
    els.roundMeta.textContent = "輪次 " + (state.roundIndex + 1) + " / " + rounds;
    els.chipAName.textContent = a.name;
    els.chipATotal.textContent = teamTotalLabel(a);
    els.totals.classList.toggle("is-solo", solo);
    els.chipB.hidden = solo;
    if (solo) {
      els.chipA.classList.add("is-active");
    } else {
      var b = state.teams[1];
      els.chipBName.textContent = b.name;
      els.chipBTotal.textContent = teamTotalLabel(b);
      els.chipA.classList.toggle("is-active", state.teamIndex === 0);
      els.chipB.classList.toggle("is-active", state.teamIndex === 1);
    }
    els.goalOverlay.innerHTML = "目標 <span>" + G.formatGoal(G.currentTargetSec(state)) + "</span>";
    if (els.playConfig) {
      els.playConfig.textContent = G.formatMatchConfig(state);
    }
  }

  function setReady() {
    phase = "ready";
    elapsedMs = 0;
    els.mainLed.classList.remove("is-running");
    renderMainLed(0);
    els.diffCard.classList.remove("is-visible");
    els.stopBtn.hidden = false;
    els.stopBtn.textContent = "開始";
    els.stopBtn.classList.add("is-start");
    els.continueBtn.hidden = true;
    els.playHint.textContent = "空白鍵也可開始 / 停錶";
    if (lastAdvance && lastAdvance.kind === "next-team") {
      els.statusLine.textContent = state.teams[0].name + " 打完了，換 " + G.currentTeam(state).name + " 上場";
    } else {
      els.statusLine.textContent = "心中默數，按開始後從 0 起跳";
    }
    renderPlayChrome();
  }

  function startTimer() {
    if (phase !== "ready") return;
    phase = "running";
    lastAdvance = null;
    startTs = performance.now();
    elapsedMs = 0;
    blankMainLed();
    els.mainLed.classList.add("is-running");
    els.diffCard.classList.remove("is-visible");
    els.stopBtn.textContent = "停";
    els.stopBtn.classList.remove("is-start");
    els.statusLine.textContent = "默數中…";
    els.playHint.textContent = "點按鈕或按空白鍵停錶";
  }

  function stopTimer() {
    if (phase !== "running") return;
    var now = performance.now();
    elapsedMs = now - startTs;
    els.mainLed.classList.remove("is-running");
    lastStopAt = now;
    var entry = G.recordStop(state, elapsedMs);
    lastAdvance = G.peekAdvance(state);
    phase = "stopped";
    renderMainLed(entry.stoppedMs);
    renderDiffLed(entry.errorCs);
    els.diffCard.classList.add("is-visible");
    els.stopBtn.hidden = true;
    els.continueBtn.hidden = false;
    var continueLabel = "繼續";
    if (lastAdvance.kind === "next-team") {
      continueLabel = state.mode === "1v1" ? "換人上場" : "換隊上場";
    }
    if (lastAdvance.kind === "result") continueLabel = "看結果";
    els.continueBtn.textContent = continueLabel;
    els.statusLine.textContent =
      "停在 " + G.formatLed(entry.stoppedMs) + "　本輪誤差 " + G.formatDiff(entry.errorCs);
    els.playHint.textContent = "空白鍵繼續";
    renderPlayChrome();
  }

  function continueAfterStop() {
    if (phase !== "stopped") return;
    var next = G.advance(state);
    lastAdvance = next;
    if (next.kind === "result") {
      showResult();
      return;
    }
    setReady();
  }

  function handlePrimary() {
    if (phase === "ready") startTimer();
    else if (phase === "running") stopTimer();
    else if (phase === "stopped") continueAfterStop();
  }

  function showResult() {
    phase = "result";
    showScreen("result");
    var a = state.teams[0];
    var solo = state.mode === "solo";
    var targets = G.targetsOf(state);
    els.resultSub.textContent = solo
      ? "第 " + state.matchupNumber + " 局"
      : "第 " + state.matchupNumber + " 組";
    els.scoreAName.textContent = a.name;
    els.scoreASum.textContent = G.formatSeconds(G.teamTotalCs(a)) + " 秒";
    els.thA.textContent = a.name;
    els.scoreGrid.classList.toggle("is-solo", solo);
    els.scoreB.hidden = solo;
    els.thB.hidden = solo;
    els.nextMatchupBtn.textContent = solo ? "再來一局" : "下一組";
    if (solo) {
      els.resultTitle.textContent = "本局成績";
      els.scoreA.classList.remove("is-winner");
    } else {
      var b = state.teams[1];
      var win = G.winnerIndex(state);
      els.scoreBName.textContent = b.name;
      els.scoreBSum.textContent = G.formatSeconds(G.teamTotalCs(b)) + " 秒";
      els.thB.textContent = b.name;
      els.scoreA.classList.toggle("is-winner", win === 0);
      els.scoreB.classList.toggle("is-winner", win === 1);
      if (win === -1) {
        els.resultTitle.textContent = "平手";
      } else {
        els.resultTitle.textContent = state.teams[win].name + " 勝";
      }
    }
    els.roundBody.innerHTML = "";
    for (var i = 0; i < targets.length; i++) {
      var ra = a.rounds[i];
      var tr = document.createElement("tr");
      if (solo) {
        tr.innerHTML =
          "<td>" +
          (i + 1) +
          "</td><td>" +
          G.formatTargetLabel(targets[i]) +
          "</td><td>" +
          G.formatSeconds(ra.errorCs) +
          "</td>";
      } else {
        var rb = state.teams[1].rounds[i];
        tr.innerHTML =
          "<td>" +
          (i + 1) +
          "</td><td>" +
          G.formatTargetLabel(targets[i]) +
          "</td><td>" +
          G.formatSeconds(ra.errorCs) +
          "<br><small>" +
          ra.player +
          "</small></td><td>" +
          G.formatSeconds(rb.errorCs) +
          "<br><small>" +
          rb.player +
          "</small></td>";
      }
      els.roundBody.appendChild(tr);
    }
  }

  function beginMatchup() {
    var setup = readSetup();
    var err = G.validateSetup(setup);
    if (err) {
      els.setupError.textContent = err;
      return;
    }
    els.setupError.textContent = "";
    setup.matchupNumber = matchupNumber;
    state = G.createMatchup(setup);
    lastAdvance = null;
    showScreen("play");
    setReady();
  }

  if (els.modeOptions) {
    els.modeOptions.addEventListener("click", function (e) {
      var option = closestModeOption(e.target);
      if (!option || !els.modeOptions.contains(option)) return;
      var input = option.querySelector('input[name="mode"]');
      if (!input) return;
      e.preventDefault();
      selectMode(input.value);
    });
  }

  Array.prototype.forEach.call(els.modeInputs, function (input) {
    input.addEventListener("change", function () {
      selectMode(input.value);
    });
  });

  els.targetsInput.addEventListener("input", updateTargetsPreview);

  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    beginMatchup();
  });

  els.stopBtn.addEventListener("pointerdown", function (e) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    els.stopBtn.classList.add("is-pressed");
    handlePrimary();
  });

  els.stopBtn.addEventListener("pointerup", function () {
    els.stopBtn.classList.remove("is-pressed");
  });

  els.stopBtn.addEventListener("pointerleave", function () {
    els.stopBtn.classList.remove("is-pressed");
  });

  els.stopBtn.addEventListener("click", function (e) {
    e.preventDefault();
  });

  els.continueBtn.addEventListener("click", function () {
    continueAfterStop();
  });

  els.nextMatchupBtn.addEventListener("click", function () {
    matchupNumber += 1;
    beginMatchup();
  });

  els.editNamesBtn.addEventListener("click", function () {
    matchupNumber += 1;
    phase = "setup";
    showScreen("setup");
  });

  window.addEventListener("keydown", function (e) {
    if (e.code !== "Space" && e.key !== " ") return;
    if (isTypingTarget(e.target)) return;
    if (phase === "setup" || phase === "result") return;
    if (e.repeat) return;
    e.preventDefault();
    handlePrimary();
  });

  selectMode(currentMode());
  updateTargetsPreview();
  renderMainLed(0);
})();
