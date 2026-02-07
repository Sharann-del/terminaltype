#!/usr/bin/env node
'use strict';

const path = require('path');
const { createStats } = require('./engine/stats');
const {
  createLineBasedTypingState,
  createCustomTypingState,
  createZenTypingState,
} = require('./engine/typing');
const { setupRawInput, restoreTerminal } = require('./engine/input');
const {
  clearScreen,
  showCursor,
  renderEntryAndMainMenu,
  renderTimeSubmenu,
  renderWordsSubmenu,
  renderCustomInputScreen,
  renderZenTestScreen,
  renderTestScreen,
  renderResultsScreen,
  TIME_OPTIONS,
  WORD_OPTIONS,
} = require('./engine/renderer');

const WORDLIST_PATH = path.join(__dirname, 'wordlist.txt');

const SCREENS = {
  MAIN_MENU: 'main_menu',
  TIME_SUB: 'time_sub',
  WORDS_SUB: 'words_sub',
  CUSTOM_INPUT: 'custom_input',
  TEST: 'test',
  RESULTS: 'results',
};

function run() {
  let screen = SCREENS.MAIN_MENU;
  let mainMenuIndex = 0;
  let timeSubIndex = 0;
  let wordsSubIndex = 0;
  let customInputText = '';
  let testMode = null;
  let timeLimitSeconds = null;
  let wordLimit = null;
  let customText = null;

  let typingState = null;
  let stats = null;
  let started = false;
  let completed = false;
  let caretPhase = 0;
  let renderInterval = null;

  function exit(code = 0) {
    if (renderInterval) clearInterval(renderInterval);
    restoreTerminal();
    clearScreen();
    showCursor();
    process.exit(code);
  }

  function goToMainMenu() {
    screen = SCREENS.MAIN_MENU;
    mainMenuIndex = 0;
    renderEntryAndMainMenu(mainMenuIndex);
  }

  function startTest() {
    screen = SCREENS.TEST;
    testMode = getTestModeFromState();
    stats = createStats();
    if (testMode === 'zen') {
      typingState = createZenTypingState();
    } else if (testMode === 'custom' && customText) {
      typingState = createCustomTypingState(customText);
    } else if (testMode === 'words') {
      typingState = createLineBasedTypingState(WORDLIST_PATH, { wordCount: wordLimit });
    } else {
      typingState = createLineBasedTypingState(WORDLIST_PATH);
      timeLimitSeconds = timeLimitSeconds ?? 30;
    }
    started = false;
    completed = false;
    caretPhase = 0;
    if (renderInterval) clearInterval(renderInterval);
    renderInterval = setInterval(tick, 500);
    tick();
  }

  function getTestModeFromState() {
    if (customText) return 'custom';
    if (wordLimit != null) return 'words';
    if (timeLimitSeconds != null) return 'time';
    return 'zen';
  }

  function tick() {
    if (completed) return;
    if (!stats || !typingState) return;

    if (screen === SCREENS.TEST && testMode === 'zen') {
      renderZenTestScreen(stats, typingState.getTypedSoFar(), caretPhase);
      caretPhase += 1;
      return;
    }

    if (testMode === 'zen') return;

    const elapsed = stats.getElapsedSeconds();
    const timeLimit = timeLimitSeconds ?? 0;
    const wordLimitForComplete = wordLimit ?? 0;

    if (started && testMode === 'time' && elapsed >= timeLimit) {
      completed = true;
      screen = SCREENS.RESULTS;
      if (renderInterval) clearInterval(renderInterval);
      renderResultsScreen({ stats });
      return;
    }
    if (started && testMode === 'words' && typingState.isTestComplete(null, elapsed)) {
      completed = true;
      screen = SCREENS.RESULTS;
      if (renderInterval) clearInterval(renderInterval);
      renderResultsScreen({ stats });
      return;
    }

    caretPhase += 1;
    renderTestScreen({
      typingState,
      stats,
      timeLimitSeconds: timeLimit || 999999,
      wordLimit: wordLimit ?? undefined,
      caretPhase,
    });
  }

  function onKey(event) {
    if (event.type === 'exit') {
      exit(0);
      return;
    }

    if (screen === SCREENS.MAIN_MENU) {
      if (event.type === 'arrowUp') {
        mainMenuIndex = (mainMenuIndex - 1 + 4) % 4;
        renderEntryAndMainMenu(mainMenuIndex);
        return;
      }
      if (event.type === 'arrowDown') {
        mainMenuIndex = (mainMenuIndex + 1) % 4;
        renderEntryAndMainMenu(mainMenuIndex);
        return;
      }
      if (event.type === 'enter') {
        if (mainMenuIndex === 0) {
          screen = SCREENS.TIME_SUB;
          timeSubIndex = 0;
          timeLimitSeconds = null;
          wordLimit = null;
          customText = null;
          renderTimeSubmenu(timeSubIndex);
        } else if (mainMenuIndex === 1) {
          screen = SCREENS.WORDS_SUB;
          wordsSubIndex = 0;
          timeLimitSeconds = null;
          wordLimit = null;
          customText = null;
          renderWordsSubmenu(wordsSubIndex);
        } else if (mainMenuIndex === 2) {
          timeLimitSeconds = null;
          wordLimit = null;
          customText = null;
          startTest();
        } else {
          screen = SCREENS.CUSTOM_INPUT;
          customInputText = '';
          timeLimitSeconds = null;
          wordLimit = null;
          renderCustomInputScreen('Your text:', customInputText, 0);
        }
      }
      return;
    }

    if (screen === SCREENS.TIME_SUB) {
      if (event.type === 'escape') {
        goToMainMenu();
        return;
      }
      if (event.type === 'arrowUp') {
        timeSubIndex = (timeSubIndex - 1 + TIME_OPTIONS.length) % TIME_OPTIONS.length;
        renderTimeSubmenu(timeSubIndex);
        return;
      }
      if (event.type === 'arrowDown') {
        timeSubIndex = (timeSubIndex + 1) % TIME_OPTIONS.length;
        renderTimeSubmenu(timeSubIndex);
        return;
      }
      if (event.type === 'enter') {
        timeLimitSeconds = TIME_OPTIONS[timeSubIndex];
        wordLimit = null;
        customText = null;
        startTest();
      }
      return;
    }

    if (screen === SCREENS.WORDS_SUB) {
      if (event.type === 'escape') {
        goToMainMenu();
        return;
      }
      if (event.type === 'arrowUp') {
        wordsSubIndex = (wordsSubIndex - 1 + WORD_OPTIONS.length) % WORD_OPTIONS.length;
        renderWordsSubmenu(wordsSubIndex);
        return;
      }
      if (event.type === 'arrowDown') {
        wordsSubIndex = (wordsSubIndex + 1) % WORD_OPTIONS.length;
        renderWordsSubmenu(wordsSubIndex);
        return;
      }
      if (event.type === 'enter') {
        wordLimit = WORD_OPTIONS[wordsSubIndex];
        timeLimitSeconds = null;
        customText = null;
        startTest();
      }
      return;
    }

    if (screen === SCREENS.CUSTOM_INPUT) {
      if (event.type === 'escape') {
        customInputText = '';
        goToMainMenu();
        return;
      }
      if (event.type === 'enter') {
        const text = customInputText.trim();
        if (text.length > 0) {
          customText = text;
          timeLimitSeconds = null;
          wordLimit = null;
          screen = SCREENS.TEST;
          startTest();
        }
        return;
      }
      if (event.type === 'backspace') {
        customInputText = customInputText.slice(0, -1);
        renderCustomInputScreen('Your text:', customInputText, customInputText.length);
        return;
      }
      if (event.type === 'char') {
        customInputText += event.char;
        renderCustomInputScreen('Your text:', customInputText, customInputText.length);
      }
      return;
    }

    if (screen === SCREENS.RESULTS) {
      if (event.type === 'enter') {
        screen = SCREENS.MAIN_MENU;
        goToMainMenu();
      }
      return;
    }

    if (screen === SCREENS.TEST) {
      if (testMode === 'zen') {
        if (event.type === 'enter') {
          completed = true;
          screen = SCREENS.RESULTS;
          if (renderInterval) clearInterval(renderInterval);
          renderResultsScreen({ stats });
          return;
        }
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
            typingState.handleSpace(stats);
          } else {
            typingState.handleCharacter(event.char, stats);
          }
          tick();
        }
        return;
      }

      if (event.type === 'enter') {
        if (started && !completed && testMode !== 'custom') {
          startTest();
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
        const timeLimit = timeLimitSeconds ?? 0;
        if (
          (testMode === 'time' && elapsed >= timeLimit) ||
          typingState.isTestComplete(timeLimitSeconds, elapsed)
        ) {
          completed = true;
          screen = SCREENS.RESULTS;
          if (renderInterval) clearInterval(renderInterval);
          renderResultsScreen({ stats });
        } else {
          tick();
        }
      }
    }
  }

  setupRawInput(onKey);
  goToMainMenu();
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

module.exports = { run };
