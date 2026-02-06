#!/usr/bin/env node
'use strict';

const path = require('path');
const { createStats } = require('./engine/stats');
const { createLineBasedTypingState } = require('./engine/typing');
const { setupRawInput, restoreTerminal } = require('./engine/input');
const {
  clearScreen,
  showCursor,
  renderTimeSelectScreen,
  renderTestScreen,
  renderResultsScreen,
} = require('./engine/renderer');

const TIME_OPTIONS = [15, 30, 45, 60];
const DEFAULT_TIME_INDEX = 1;
const WORDLIST_PATH = path.join(__dirname, 'wordlist.txt');

function parseArgs() {
  const args = process.argv.slice(2);
  let timeLimit = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--time' && args[i + 1] != null) {
      const n = parseInt(args[i + 1], 10);
      if ([15, 30, 45, 60].includes(n)) timeLimit = n;
      i += 1;
    }
  }
  return { timeLimit };
}

function run() {
  const { timeLimit: cliTime } = parseArgs();

  let timeLimit = cliTime;
  let selectedTimeIndex = DEFAULT_TIME_INDEX;
  let typingState;
  let stats;
  let started = false;
  let completed = false;
  let caretPhase = 0;
  let renderInterval;

  function exit(code = 0) {
    if (renderInterval) clearInterval(renderInterval);
    restoreTerminal();
    clearScreen();
    showCursor();
    process.exit(code);
  }

  function startTest(selectedTime) {
    timeLimit = selectedTime;
    stats = createStats();
    typingState = createLineBasedTypingState(WORDLIST_PATH);
    renderInterval = setInterval(tick, 500);
    tick();
  }

  function tick() {
    if (completed) return;
    if (!stats || !typingState) return;
    const elapsed = stats.getElapsedSeconds();
    if (started && elapsed >= timeLimit) {
      completed = true;
      clearInterval(renderInterval);
      renderResultsScreen({ stats });
      return;
    }
    caretPhase += 1;
    renderTestScreen({
      typingState,
      stats,
      timeLimitSeconds: timeLimit,
      caretPhase,
    });
  }

  function onKey(event) {
    if (event.type === 'exit') {
      exit(0);
      return;
    }
    if (timeLimit === null) {
      if (event.type === 'arrowUp') {
        selectedTimeIndex = (selectedTimeIndex - 1 + TIME_OPTIONS.length) % TIME_OPTIONS.length;
        renderTimeSelectScreen(selectedTimeIndex);
        return;
      }
      if (event.type === 'arrowDown') {
        selectedTimeIndex = (selectedTimeIndex + 1) % TIME_OPTIONS.length;
        renderTimeSelectScreen(selectedTimeIndex);
        return;
      }
      if (event.type === 'enter') {
        startTest(TIME_OPTIONS[selectedTimeIndex]);
        return;
      }
      return;
    }
    if (completed) return;
    if (!started) {
      started = true;
      stats.start();
    }
    if (event.type === 'backspace') {
      typingState.handleBackspace(stats);
      tick();
      return;
    }
    if (event.type === 'char') {
      if (event.char === ' ') {
        const { scrolled } = typingState.handleSpace(stats);
        tick();
        return;
      }
      typingState.handleCharacter(event.char, stats);
      const elapsed = stats.getElapsedSeconds();
      if (elapsed >= timeLimit || typingState.isTestComplete(timeLimit, elapsed)) {
        completed = true;
        clearInterval(renderInterval);
        renderResultsScreen({ stats });
      } else {
        tick();
      }
    }
  }

  setupRawInput(onKey);

  if (timeLimit != null) {
    startTest(timeLimit);
  } else {
    renderTimeSelectScreen(selectedTimeIndex);
  }
}

if (require.main === module) {
  if (!process.stdin.isTTY) {
    console.error('This program requires an interactive terminal.');
    process.exit(1);
  }
  process.on('SIGINT', () => {
    restoreTerminal();
    clearScreen();
    showCursor();
    process.exit(0);
  });
  run();
}

module.exports = { run, parseArgs };
