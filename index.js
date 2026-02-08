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
  renderSettingsScreen,
  getSettingsOptionCount,
  TIME_OPTIONS,
  WORD_OPTIONS,
  MAIN_MENU_OPTIONS,
  SETTINGS_CATEGORIES,
  BEHAVIOR_OPTIONS,
  CARET_OPTIONS,
  APPEARANCE_OPTIONS,
  KEYMAP_OPTIONS,
  THEME_PRESET_NAMES,
  THEME_COLOR_OPTIONS,
  THEME_COLOR_PALETTE,
} = require('./engine/renderer');
const {
  getBehavior,
  setBehavior,
  getCaret,
  setCaret,
  getAppearance,
  setAppearance,
  getKeymap,
  setKeymap,
  getTheme,
  getEffectiveTheme,
  setThemePreset,
  setCustomThemeColor,
  save: saveConfig,
  clearConfigCache,
  addResultToHistory,
} = require('./engine/config');

const { configManager } = require('./core/configManager');

const WORDLIST_PATH = path.join(__dirname, 'wordlist.txt');

const SCREENS = {
  MAIN_MENU: 'main_menu',
  TIME_SUB: 'time_sub',
  WORDS_SUB: 'words_sub',
  CUSTOM_INPUT: 'custom_input',
  SETTINGS: 'settings',
  TEST: 'test',
  RESULTS: 'results',
};

async function run() {
  await configManager.init();
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
  let displayCaretCharIndex = 0;
  let tapeScrollOffset = 0;
  let tapeScrollTarget = 0;
  let lastKeyPressed = null;

  let settingsCategoryIndex = 0;
  let settingsPanelFocus = 'left';
  let settingsRightOptionIndex = 0;
  const settingsOptionStates = [];

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
    renderEntryAndMainMenu(mainMenuIndex, getEffectiveTheme());
  }

  function showResults() {
    // Record final WPM sample so graph has an end point (helps Zen and short custom tests)
    if (typeof stats.sampleWpm === 'function') stats.sampleWpm(true);
    const s = stats.getSnapshot();
    const durationSeconds = s.elapsedSeconds;
    addResultToHistory({
      wpm: s.wpm,
      rawWpm: Math.round(s.rawWpm),
      accuracy: parseFloat(s.accuracy),
      consistency: s.consistency != null ? s.consistency : (typeof stats.getConsistency === 'function' ? stats.getConsistency() : 100),
      correctCharacters: s.correctCharacters,
      totalTypedCharacters: s.totalTypedCharacters,
      totalErrors: s.totalErrors,
      testType: testMode === 'zen' ? 'zen' : testMode === 'custom' ? 'custom' : testMode === 'time' ? `time ${timeLimitSeconds || 0}s` : testMode === 'words' ? `words ${wordLimit || 0}` : 'test',
      durationSeconds,
      timestamp: Date.now(),
    });
    let pbWpm = null;
    try {
      const pb = configManager && configManager.get('personalBests');
      if (pb && typeof pb.wpm === 'number') pbWpm = pb.wpm;
    } catch (_) {}
    const resultOptions = { stats, themeConfig: getEffectiveTheme(), testMode, timeLimitSeconds, wordLimit, pbWpm };
    screen = SCREENS.RESULTS;
    renderResultsScreen(resultOptions);
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
    displayCaretCharIndex = 0;
    tapeScrollOffset = 0;
    tapeScrollTarget = 0;
    lastKeyPressed = null;
    if (renderInterval) clearInterval(renderInterval);
    renderInterval = setInterval(tick, 50);
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
    if (screen !== SCREENS.TEST) return;

    // Sample WPM for graph before any early return (needed for Zen and short tests)
    if (typeof stats.sampleWpm === 'function') stats.sampleWpm();

    if (screen === SCREENS.TEST && testMode === 'zen') {
      renderZenTestScreen(stats, typingState.getTypedSoFar(), caretPhase, getEffectiveTheme());
      caretPhase += 1;
      return;
    }

    if (testMode === 'zen') return;

    const elapsed = stats.getElapsedSeconds();
    const timeLimit = timeLimitSeconds ?? 0;
    const wordLimitForComplete = wordLimit ?? 0;

    if (started && testMode === 'time' && elapsed >= timeLimit) {
      completed = true;
      if (renderInterval) clearInterval(renderInterval);
      showResults();
      return;
    }
    if (started && testMode === 'words' && typingState.isTestComplete(null, elapsed)) {
      completed = true;
      if (renderInterval) clearInterval(renderInterval);
      showResults();
      return;
    }

    caretPhase += 1;

    const caretConfig = getCaret();
    let mainCaretPosition = null;
    let paceCaretPosition = null;

    if (typingState.getLogicalCaretCharIndex && typingState.getPositionFromCharIndex) {
      const logicalIndex = typingState.getLogicalCaretCharIndex();
      displayCaretCharIndex += (logicalIndex - displayCaretCharIndex) * 0.55;
      const displayIndex = Math.round(displayCaretCharIndex);
      mainCaretPosition = typingState.getPositionFromCharIndex(displayIndex);

      if (caretConfig.paceCaret && caretConfig.paceCaret !== 'off') {
        const elapsed = stats.getElapsedSeconds();
        let paceWpm = 40;
        if (caretConfig.paceCaret === 'avg') {
          paceWpm = Math.max(1, Math.round(stats.getWPM()));
        } else if (caretConfig.paceCaret === 'custom' && typeof caretConfig.paceCaretCustomWpm === 'number') {
          paceWpm = Math.max(1, caretConfig.paceCaretCustomWpm);
        } else if (caretConfig.paceCaret === 'pb' || caretConfig.paceCaret === 'last' || caretConfig.paceCaret === 'daily') {
          paceWpm = 50;
        }
        const paceCharIndex = Math.floor((elapsed / 60) * paceWpm * 5);
        paceCaretPosition = typingState.getPositionFromCharIndex(paceCharIndex);
      }
    }

    const keymapConfig = getKeymap();
    const tapeMode = keymapConfig.tapeMode || 'off';
    const useTape = (tapeMode === 'letter' || tapeMode === 'word') && typeof typingState.getTapeLength === 'function';
    if (useTape) {
      const cols = process.stdout.columns || 80;
      const fullWidth = Math.max(20, cols - 2 - 4);
      const tapeWidthPct = Math.max(50, Math.min(100, keymapConfig.tapeMargin ?? 100)) / 100;
      const viewportWidth = Math.max(20, Math.floor(fullWidth * tapeWidthPct));
      const caretIndex = typingState.getLogicalCaretCharIndex ? typingState.getLogicalCaretCharIndex() : 0;
      const tapeLength = typingState.getTapeLength();
      const maxScroll = Math.max(0, tapeLength - viewportWidth);
      tapeScrollTarget = Math.max(0, Math.min(caretIndex - Math.floor(viewportWidth * 0.5), maxScroll));
      const smooth = 0.25;
      tapeScrollOffset += (tapeScrollTarget - tapeScrollOffset) * smooth;
    }

    const displayIndex = typingState.getLogicalCaretCharIndex && typingState.getPositionFromCharIndex
      ? Math.round(displayCaretCharIndex)
      : 0;
    renderTestScreen({
      typingState,
      stats,
      testMode,
      timeLimitSeconds: testMode === 'time' ? (timeLimitSeconds ?? 0) : null,
      wordLimit: wordLimit ?? undefined,
      caretPhase,
      appearanceConfig: getAppearance(),
      themeConfig: getEffectiveTheme(),
      behaviorConfig: getBehavior(),
      caretConfig,
      keymapConfig,
      mainCaretPosition,
      mainCaretCharIndex: useTape ? displayIndex : undefined,
      paceCaretPosition,
      tapeScrollOffset: useTape ? tapeScrollOffset : 0,
      lastKeyPressed,
    });
  }

  function onKey(event) {
    if (event.type === 'exit') {
      exit(0);
      return;
    }
    if (event.type === 'char' && (event.char === '\u001b' || event.char === '\x1b')) {
      event = { type: 'escape' };
    }

    if (screen === SCREENS.MAIN_MENU) {
      if (event.type === 'char' && (event.char === 'q' || event.char === 'Q')) {
        exit(0);
        return;
      }
      if (event.type === 'arrowUp') {
        mainMenuIndex = (mainMenuIndex - 1 + MAIN_MENU_OPTIONS.length) % MAIN_MENU_OPTIONS.length;
        renderEntryAndMainMenu(mainMenuIndex, getEffectiveTheme());
        return;
      }
      if (event.type === 'arrowDown') {
        mainMenuIndex = (mainMenuIndex + 1) % MAIN_MENU_OPTIONS.length;
        renderEntryAndMainMenu(mainMenuIndex, getEffectiveTheme());
        return;
      }
      if (event.type === 'enter') {
        if (mainMenuIndex === 4) {
          screen = SCREENS.SETTINGS;
          settingsCategoryIndex = 0;
          settingsPanelFocus = 'left';
          settingsRightOptionIndex = 0;
          renderSettingsScreen({
            categoryIndex: settingsCategoryIndex,
            panelFocus: settingsPanelFocus,
            rightOptionIndex: settingsRightOptionIndex,
            optionStates: settingsOptionStates,
            behaviorConfig: getBehavior(),
            caretConfig: getCaret(),
            appearanceConfig: getAppearance(),
            keymapConfig: getKeymap(),
            themeConfig: getTheme(),
          });
          return;
        }
        if (mainMenuIndex === 0) {
          screen = SCREENS.TIME_SUB;
          timeSubIndex = 0;
          timeLimitSeconds = null;
          wordLimit = null;
          customText = null;
          renderTimeSubmenu(timeSubIndex, getEffectiveTheme());
        } else if (mainMenuIndex === 1) {
          screen = SCREENS.WORDS_SUB;
          wordsSubIndex = 0;
          timeLimitSeconds = null;
          wordLimit = null;
          customText = null;
          renderWordsSubmenu(wordsSubIndex, getEffectiveTheme());
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
          renderCustomInputScreen('Your text:', customInputText, 0, getEffectiveTheme());
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
        renderTimeSubmenu(timeSubIndex, getEffectiveTheme());
        return;
      }
      if (event.type === 'arrowDown') {
        timeSubIndex = (timeSubIndex + 1) % TIME_OPTIONS.length;
        renderTimeSubmenu(timeSubIndex, getEffectiveTheme());
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
        renderWordsSubmenu(wordsSubIndex, getEffectiveTheme());
        return;
      }
      if (event.type === 'arrowDown') {
        wordsSubIndex = (wordsSubIndex + 1) % WORD_OPTIONS.length;
        renderWordsSubmenu(wordsSubIndex, getEffectiveTheme());
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
        renderCustomInputScreen('Your text:', customInputText, customInputText.length, getEffectiveTheme());
        return;
      }
      if (event.type === 'char') {
        customInputText += event.char;
        renderCustomInputScreen('Your text:', customInputText, customInputText.length, getEffectiveTheme());
      }
      return;
    }

    if (screen === SCREENS.SETTINGS) {
      function renderSettings() {
        renderSettingsScreen({
          categoryIndex: settingsCategoryIndex,
          panelFocus: settingsPanelFocus,
          rightOptionIndex: settingsRightOptionIndex,
          optionStates: settingsOptionStates,
          behaviorConfig: getBehavior(),
          caretConfig: getCaret(),
          appearanceConfig: getAppearance(),
          keymapConfig: getKeymap(),
          themeConfig: getTheme(),
        });
      }
      if (event.type === 'escape') {
        goToMainMenu();
        return;
      }
      if (event.type === 'char' && event.char === 'r') {
        if (configManager && typeof configManager.reset === 'function') {
          configManager.reset();
          clearConfigCache();
        }
        renderSettings();
        return;
      }
      const navUp = event.type === 'arrowUp' || (event.type === 'char' && event.char === 'k');
      const navDown = event.type === 'arrowDown' || (event.type === 'char' && event.char === 'j');
      const isBehaviorCategory = settingsCategoryIndex === 0;
      const isAppearanceCategory = settingsCategoryIndex === 1;
      const isCaretCategory = settingsCategoryIndex === 2;
      const isKeymapCategory = settingsCategoryIndex === 3;
      const isThemeCategory = settingsCategoryIndex === 4;
      if (event.type === 'arrowLeft' && settingsPanelFocus === 'right' && isBehaviorCategory && BEHAVIOR_OPTIONS[settingsRightOptionIndex]) {
        const opt = BEHAVIOR_OPTIONS[settingsRightOptionIndex];
        const behavior = getBehavior();
        const idx = opt.values.indexOf(behavior[opt.key]);
        const valueIdx = idx >= 0 ? (idx - 1 + opt.values.length) % opt.values.length : 0;
        setBehavior(opt.key, opt.values[valueIdx]);
        saveConfig();
        renderSettings();
        return;
      }
      if (event.type === 'arrowRight' && settingsPanelFocus === 'right' && isBehaviorCategory && BEHAVIOR_OPTIONS[settingsRightOptionIndex]) {
        const opt = BEHAVIOR_OPTIONS[settingsRightOptionIndex];
        const behavior = getBehavior();
        const idx = opt.values.indexOf(behavior[opt.key]);
        const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
        setBehavior(opt.key, opt.values[valueIdx]);
        saveConfig();
        renderSettings();
        return;
      }
      if (event.type === 'arrowLeft' && settingsPanelFocus === 'right' && isCaretCategory && CARET_OPTIONS[settingsRightOptionIndex]) {
        const opt = CARET_OPTIONS[settingsRightOptionIndex];
        const caret = getCaret();
        if (opt.type === 'slider') {
          const value = caret[opt.key] ?? opt.min;
          const newValue = Math.max(opt.min, value - (opt.step || 5));
          setCaret(opt.key, newValue);
          saveConfig();
          renderSettings();
        } else {
          const idx = opt.values.indexOf(caret[opt.key]);
          const valueIdx = idx >= 0 ? (idx - 1 + opt.values.length) % opt.values.length : 0;
          setCaret(opt.key, opt.values[valueIdx]);
          saveConfig();
          renderSettings();
        }
        return;
      }
      if (event.type === 'arrowRight' && settingsPanelFocus === 'right' && isCaretCategory && CARET_OPTIONS[settingsRightOptionIndex]) {
        const opt = CARET_OPTIONS[settingsRightOptionIndex];
        const caret = getCaret();
        if (opt.type === 'slider') {
          const value = caret[opt.key] ?? opt.min;
          const newValue = Math.min(opt.max, value + (opt.step || 5));
          setCaret(opt.key, newValue);
          saveConfig();
          renderSettings();
        } else {
          const idx = opt.values.indexOf(caret[opt.key]);
          const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
          setCaret(opt.key, opt.values[valueIdx]);
          saveConfig();
          renderSettings();
        }
        return;
      }
      if (event.type === 'arrowLeft' && settingsPanelFocus === 'right' && isAppearanceCategory && APPEARANCE_OPTIONS[settingsRightOptionIndex]) {
        const opt = APPEARANCE_OPTIONS[settingsRightOptionIndex];
        const appearance = getAppearance();
        if (opt.type === 'slider') {
          const value = appearance[opt.key] ?? opt.min;
          const newValue = Math.max(opt.min, value - (opt.step || 5));
          setAppearance(opt.key, newValue);
        } else {
          const idx = opt.values.indexOf(appearance[opt.key]);
          const valueIdx = idx >= 0 ? (idx - 1 + opt.values.length) % opt.values.length : 0;
          setAppearance(opt.key, opt.values[valueIdx]);
        }
        saveConfig();
        renderSettings();
        return;
      }
      if (event.type === 'arrowRight' && settingsPanelFocus === 'right' && isAppearanceCategory && APPEARANCE_OPTIONS[settingsRightOptionIndex]) {
        const opt = APPEARANCE_OPTIONS[settingsRightOptionIndex];
        const appearance = getAppearance();
        if (opt.type === 'slider') {
          const value = appearance[opt.key] ?? opt.min;
          const newValue = Math.min(opt.max, value + (opt.step || 5));
          setAppearance(opt.key, newValue);
        } else {
          const idx = opt.values.indexOf(appearance[opt.key]);
          const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
          setAppearance(opt.key, opt.values[valueIdx]);
        }
        saveConfig();
        renderSettings();
        return;
      }
      if (event.type === 'arrowLeft' && settingsPanelFocus === 'right' && isKeymapCategory && KEYMAP_OPTIONS[settingsRightOptionIndex]) {
        const opt = KEYMAP_OPTIONS[settingsRightOptionIndex];
        const keymap = getKeymap();
        if (opt.type === 'slider') {
          const value = keymap[opt.key] ?? opt.min;
          const newValue = Math.max(opt.min, value - (opt.step || 5));
          setKeymap(opt.key, newValue);
          saveConfig();
          renderSettings();
        } else {
          const idx = opt.values.indexOf(keymap[opt.key]);
          const valueIdx = idx >= 0 ? (idx - 1 + opt.values.length) % opt.values.length : 0;
          setKeymap(opt.key, opt.values[valueIdx]);
          saveConfig();
          renderSettings();
        }
        return;
      }
      if (event.type === 'arrowRight' && settingsPanelFocus === 'right' && isKeymapCategory && KEYMAP_OPTIONS[settingsRightOptionIndex]) {
        const opt = KEYMAP_OPTIONS[settingsRightOptionIndex];
        const keymap = getKeymap();
        if (opt.type === 'slider') {
          const value = keymap[opt.key] ?? opt.min;
          const newValue = Math.min(opt.max, value + (opt.step || 5));
          setKeymap(opt.key, newValue);
          saveConfig();
          renderSettings();
        } else {
          const idx = opt.values.indexOf(keymap[opt.key]);
          const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
          setKeymap(opt.key, opt.values[valueIdx]);
          saveConfig();
          renderSettings();
        }
        return;
      }
      if (event.type === 'arrowLeft' && settingsPanelFocus === 'right' && isThemeCategory) {
        const theme = getTheme();
        if (settingsRightOptionIndex === 0) {
          const idx = THEME_PRESET_NAMES.indexOf(theme.activePreset);
          const newIdx = (idx - 1 + THEME_PRESET_NAMES.length) % THEME_PRESET_NAMES.length;
          setThemePreset(THEME_PRESET_NAMES[newIdx]);
          saveConfig();
          renderSettings();
        } else if (theme.activePreset === 'custom' && THEME_COLOR_OPTIONS[settingsRightOptionIndex - 1]) {
          const opt = THEME_COLOR_OPTIONS[settingsRightOptionIndex - 1];
          const current = (theme.custom && theme.custom[opt.key]) || '#1a1b26';
          const palIdx = THEME_COLOR_PALETTE.findIndex((c) => c.toLowerCase() === (current || '').toLowerCase());
          const newIdx = palIdx < 0 ? THEME_COLOR_PALETTE.length - 1 : (palIdx - 1 + THEME_COLOR_PALETTE.length) % THEME_COLOR_PALETTE.length;
          setCustomThemeColor(opt.key, THEME_COLOR_PALETTE[newIdx]);
          saveConfig();
          renderSettings();
        }
        return;
      }
      if (event.type === 'arrowRight' && settingsPanelFocus === 'right' && isThemeCategory) {
        const theme = getTheme();
        if (settingsRightOptionIndex === 0) {
          const idx = THEME_PRESET_NAMES.indexOf(theme.activePreset);
          const newIdx = (idx + 1) % THEME_PRESET_NAMES.length;
          setThemePreset(THEME_PRESET_NAMES[newIdx]);
          saveConfig();
          renderSettings();
        } else if (theme.activePreset === 'custom' && THEME_COLOR_OPTIONS[settingsRightOptionIndex - 1]) {
          const opt = THEME_COLOR_OPTIONS[settingsRightOptionIndex - 1];
          const current = (theme.custom && theme.custom[opt.key]) || '#1a1b26';
          const palIdx = THEME_COLOR_PALETTE.findIndex((c) => c.toLowerCase() === (current || '').toLowerCase());
          const newIdx = palIdx < 0 ? 0 : (palIdx + 1) % THEME_COLOR_PALETTE.length;
          setCustomThemeColor(opt.key, THEME_COLOR_PALETTE[newIdx]);
          saveConfig();
          renderSettings();
        }
        return;
      }
      if (event.type === 'tab') {
        settingsPanelFocus = settingsPanelFocus === 'left' ? 'right' : 'left';
        if (settingsPanelFocus === 'right') {
          const n = getSettingsOptionCount(settingsCategoryIndex, settingsCategoryIndex === 4 ? getTheme() : undefined);
          settingsRightOptionIndex = Math.min(settingsRightOptionIndex, n - 1);
        }
        renderSettings();
        return;
      }
      if (navUp) {
        if (settingsPanelFocus === 'left') {
          settingsCategoryIndex = (settingsCategoryIndex - 1 + SETTINGS_CATEGORIES.length) % SETTINGS_CATEGORIES.length;
          const n = getSettingsOptionCount(settingsCategoryIndex, settingsCategoryIndex === 4 ? getTheme() : undefined);
          settingsRightOptionIndex = Math.min(settingsRightOptionIndex, n - 1);
        } else {
          const n = getSettingsOptionCount(settingsCategoryIndex, settingsCategoryIndex === 4 ? getTheme() : undefined);
          settingsRightOptionIndex = n ? (settingsRightOptionIndex - 1 + n) % n : 0;
        }
        renderSettings();
        return;
      }
      if (navDown) {
        if (settingsPanelFocus === 'left') {
          settingsCategoryIndex = (settingsCategoryIndex + 1) % SETTINGS_CATEGORIES.length;
          const n = getSettingsOptionCount(settingsCategoryIndex, settingsCategoryIndex === 4 ? getTheme() : undefined);
          settingsRightOptionIndex = Math.min(settingsRightOptionIndex, n - 1);
        } else {
          const n = getSettingsOptionCount(settingsCategoryIndex, settingsCategoryIndex === 4 ? getTheme() : undefined);
          settingsRightOptionIndex = n ? (settingsRightOptionIndex + 1) % n : 0;
        }
        renderSettings();
        return;
      }
      if (event.type === 'enter') {
        if (settingsPanelFocus === 'left') {
          settingsRightOptionIndex = 0;
          settingsPanelFocus = 'right';
          renderSettings();
        } else if (isBehaviorCategory) {
          const opt = BEHAVIOR_OPTIONS[settingsRightOptionIndex];
          if (opt) {
            const behavior = getBehavior();
            const idx = opt.values.indexOf(behavior[opt.key]);
            const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
            setBehavior(opt.key, opt.values[valueIdx]);
            saveConfig();
            renderSettings();
          }
        } else if (isCaretCategory) {
          const opt = CARET_OPTIONS[settingsRightOptionIndex];
          if (opt) {
            const caret = getCaret();
            if (opt.type === 'slider') {
              const value = caret[opt.key] ?? opt.min;
              const newValue = Math.min(opt.max, value + (opt.step || 5));
              setCaret(opt.key, newValue);
              saveConfig();
              renderSettings();
            } else {
              const idx = opt.values.indexOf(caret[opt.key]);
              const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
              setCaret(opt.key, opt.values[valueIdx]);
              saveConfig();
              renderSettings();
            }
          }
        } else if (isAppearanceCategory) {
          const opt = APPEARANCE_OPTIONS[settingsRightOptionIndex];
          if (opt) {
            const appearance = getAppearance();
            if (opt.type === 'slider') {
              const value = appearance[opt.key] ?? opt.min;
              const newValue = Math.min(opt.max, value + (opt.step || 5));
              setAppearance(opt.key, newValue);
            } else {
              const idx = opt.values.indexOf(appearance[opt.key]);
              const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
              setAppearance(opt.key, opt.values[valueIdx]);
            }
            saveConfig();
            renderSettings();
          }
        } else if (isKeymapCategory) {
          const opt = KEYMAP_OPTIONS[settingsRightOptionIndex];
          if (opt) {
            const keymap = getKeymap();
            if (opt.type === 'slider') {
              const value = keymap[opt.key] ?? opt.min;
              const newValue = Math.min(opt.max, value + (opt.step || 5));
              setKeymap(opt.key, newValue);
              saveConfig();
              renderSettings();
            } else {
              const idx = opt.values.indexOf(keymap[opt.key]);
              const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
              setKeymap(opt.key, opt.values[valueIdx]);
              saveConfig();
              renderSettings();
            }
          }
        } else if (isThemeCategory) {
          const theme = getTheme();
          if (settingsRightOptionIndex === 0) {
            const idx = THEME_PRESET_NAMES.indexOf(theme.activePreset);
            const newIdx = (idx + 1) % THEME_PRESET_NAMES.length;
            setThemePreset(THEME_PRESET_NAMES[newIdx]);
            saveConfig();
            renderSettings();
          } else if (theme.activePreset === 'custom' && THEME_COLOR_OPTIONS[settingsRightOptionIndex - 1]) {
            const opt = THEME_COLOR_OPTIONS[settingsRightOptionIndex - 1];
            const current = (theme.custom && theme.custom[opt.key]) || '#1a1b26';
            const palIdx = THEME_COLOR_PALETTE.findIndex((c) => c.toLowerCase() === (current || '').toLowerCase());
            const newIdx = palIdx < 0 ? 0 : (palIdx + 1) % THEME_COLOR_PALETTE.length;
            setCustomThemeColor(opt.key, THEME_COLOR_PALETTE[newIdx]);
            saveConfig();
            renderSettings();
          }
        } else {
          if (!settingsOptionStates[settingsCategoryIndex]) settingsOptionStates[settingsCategoryIndex] = [];
          const opts = settingsOptionStates[settingsCategoryIndex];
          opts[settingsRightOptionIndex] = !opts[settingsRightOptionIndex];
          renderSettings();
        }
        return;
      }
      return;
    }

    if (screen === SCREENS.RESULTS) {
      if (event.type === 'enter') {
        startTest();
        return;
      }
      if (event.type === 'escape') {
        screen = SCREENS.MAIN_MENU;
        goToMainMenu();
        return;
      }
      return;
    }

    if (screen === SCREENS.TEST) {
      const behavior = getBehavior();

      if (event.type === 'shiftEnter') {
        if (testMode === 'zen') {
          completed = true;
          if (renderInterval) clearInterval(renderInterval);
          showResults();
          return;
        }
      }
      if (event.type === 'enter') {
        if (testMode === 'zen') {
          completed = true;
          if (renderInterval) clearInterval(renderInterval);
          showResults();
          return;
        }
        if (testMode !== 'custom' && behavior.quickRestart === 'enter') {
          startTest();
          return;
        }
        if (started && !completed) {
          return;
        }
      }
      if (event.type === 'tab') {
        if (testMode !== 'custom' && behavior.quickRestart === 'tab') {
          startTest();
          return;
        }
        if (started && !completed) {
          return;
        }
      }
      if (event.type === 'escape') {
        if (renderInterval) {
          clearInterval(renderInterval);
          renderInterval = null;
        }
        goToMainMenu();
        return;
      }

      if (testMode === 'zen') {
        if (!started) {
          started = true;
          stats.start();
        }
        if (event.type === 'backspace') {
          typingState.handleBackspace(stats, { allowPreviousWord: true });
          tick();
          return;
        }
        if (event.type === 'char') {
          lastKeyPressed = event.char;
          if (event.char === ' ') {
            typingState.handleSpace(stats);
          } else {
            typingState.handleCharacter(event.char, stats);
          }
          tick();
        }
        return;
      }

      if (completed) return;
      if (!started) {
        started = true;
        stats.start();
      }
      if (event.type === 'backspace') {
        if (behavior.confidenceMode !== 'max') {
          const allowPreviousWord =
            typeof typingState.canBackspaceToPreviousWord === 'function'
              ? typingState.canBackspaceToPreviousWord()
              : false;
          typingState.handleBackspace(stats, { allowPreviousWord });
        }
        tick();
        return;
      }
      if (event.type === 'char') {
        lastKeyPressed = event.char;
        if (event.char === ' ') {
          if (behavior.testDifficulty === 'expert' && typingState.currentWordHasErrors && typingState.currentWordHasErrors()) {
            completed = true;
            if (renderInterval) clearInterval(renderInterval);
            showResults();
            return;
          }
          typingState.handleSpace(stats);
          if (typeof typingState.getLastRemovedTapeChars === 'function') {
            const removed = typingState.getLastRemovedTapeChars();
            if (removed > 0) {
              tapeScrollOffset = Math.max(0, tapeScrollOffset - removed);
              tapeScrollTarget = Math.max(0, tapeScrollTarget - removed);
            }
          }
          tick();
          return;
        }
        const result = typingState.handleCharacter(event.char, stats);
        if (!result.correct && behavior.testDifficulty === 'master') {
          completed = true;
          if (renderInterval) clearInterval(renderInterval);
          showResults();
          return;
        }
        const elapsed = stats.getElapsedSeconds();
        const timeLimit = timeLimitSeconds ?? 0;
        if (
          (testMode === 'time' && elapsed >= timeLimit) ||
          typingState.isTestComplete(timeLimitSeconds, elapsed)
        ) {
          completed = true;
          if (renderInterval) clearInterval(renderInterval);
          showResults();
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
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { run };
