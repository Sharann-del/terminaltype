'use strict';

const {
  createLineBasedTypingState,
  createCustomTypingState,
  createZenTypingState,
} = require('../engine/typing');
const { createStats } = require('../engine/stats');
const { addResultToHistory } = require('../engine/config');

const SCREENS = {
  MAIN_MENU: 'main_menu',
  TIME_SUB: 'time_sub',
  WORDS_SUB: 'words_sub',
  CUSTOM_INPUT: 'custom_input',
  SETTINGS: 'settings',
  TEST: 'test',
  RESULTS: 'results',
};

function createAppState(options) {
  const wordlistPath = options.wordlistPath;
  const configManager = options.configManager || null;

  const state = {
    screen: SCREENS.MAIN_MENU,
    mainMenuIndex: 0,
    timeSubIndex: 0,
    wordsSubIndex: 0,
    customInputText: '',
    testMode: null,
    timeLimitSeconds: null,
    wordLimit: null,
    customText: null,
    typingState: null,
    stats: null,
    started: false,
    completed: false,
    caretPhase: 0,
    displayCaretCharIndex: 0,
    tapeScrollOffset: 0,
    tapeScrollTarget: 0,
    lastKeyPressed: null,
    settingsCategoryIndex: 0,
    settingsPanelFocus: 'left',
    settingsRightOptionIndex: 0,
    settingsOptionStates: [],
    renderIntervalId: null,
  };

  function getTestModeFromState() {
    if (state.customText) return 'custom';
    if (state.wordLimit != null) return 'words';
    if (state.timeLimitSeconds != null) return 'time';
    return 'zen';
  }

  function stopRenderInterval() {
    if (state.renderIntervalId) {
      clearInterval(state.renderIntervalId);
      state.renderIntervalId = null;
    }
  }

  function goToMainMenu() {
    state.screen = SCREENS.MAIN_MENU;
    state.mainMenuIndex = 0;
  }

  function startTest(config, constants) {
    const { TIME_OPTIONS, WORD_OPTIONS } = constants;
    state.screen = SCREENS.TEST;
    state.testMode = getTestModeFromState();
    state.stats = createStats();
    if (state.testMode === 'zen') {
      state.typingState = createZenTypingState();
    } else if (state.testMode === 'custom' && state.customText) {
      state.typingState = createCustomTypingState(state.customText);
    } else if (state.testMode === 'words') {
      state.typingState = createLineBasedTypingState(wordlistPath, { wordCount: state.wordLimit });
    } else {
      state.typingState = createLineBasedTypingState(wordlistPath);
      state.timeLimitSeconds = state.timeLimitSeconds ?? 30;
    }
    state.started = false;
    state.completed = false;
    state.caretPhase = 0;
    state.displayCaretCharIndex = 0;
    state.tapeScrollOffset = 0;
    state.tapeScrollTarget = 0;
    state.lastKeyPressed = null;
    stopRenderInterval();
  }

  function showResults(config) {
    if (typeof state.stats.sampleWpm === 'function') state.stats.sampleWpm(true);
    const s = state.stats.getSnapshot();
    const durationSeconds = s.elapsedSeconds;
    const testType = state.testMode === 'zen' ? 'zen' : state.testMode === 'custom' ? 'custom' : state.testMode === 'time' ? `time ${state.timeLimitSeconds || 0}s` : state.testMode === 'words' ? `words ${state.wordLimit || 0}` : 'test';
    addResultToHistory({
      wpm: s.wpm,
      rawWpm: Math.round(s.rawWpm),
      accuracy: parseFloat(s.accuracy),
      consistency: s.consistency != null ? s.consistency : (typeof state.stats.getConsistency === 'function' ? state.stats.getConsistency() : 100),
      correctCharacters: s.correctCharacters,
      totalTypedCharacters: s.totalTypedCharacters,
      totalErrors: s.totalErrors,
      testType,
      durationSeconds,
      timestamp: Date.now(),
    });
    state.screen = SCREENS.RESULTS;
  }

  function tick(config, constants, onRenderTest, onRenderZen) {
    if (state.completed) return;
    if (!state.stats || !state.typingState) return;
    if (state.screen !== SCREENS.TEST) return;

    if (typeof state.stats.sampleWpm === 'function') state.stats.sampleWpm();

    if (state.screen === SCREENS.TEST && state.testMode === 'zen') {
      onRenderZen(state);
      state.caretPhase += 1;
      return;
    }

    if (state.testMode === 'zen') return;

    const elapsed = state.stats.getElapsedSeconds();
    const timeLimit = state.timeLimitSeconds ?? 0;
    const wordLimitForComplete = state.wordLimit ?? 0;

    if (state.started && state.testMode === 'time' && elapsed >= timeLimit) {
      state.completed = true;
      stopRenderInterval();
      showResults(config);
      return;
    }
    if (state.started && state.testMode === 'words' && state.typingState.isTestComplete(null, elapsed)) {
      state.completed = true;
      stopRenderInterval();
      showResults(config);
      return;
    }

    state.caretPhase += 1;

    let mainCaretPosition = null;

    if (state.typingState.getLogicalCaretCharIndex && state.typingState.getPositionFromCharIndex) {
      const logicalIndex = state.typingState.getLogicalCaretCharIndex();
      state.displayCaretCharIndex += (logicalIndex - state.displayCaretCharIndex) * 0.55;
      const displayIndex = Math.round(state.displayCaretCharIndex);
      mainCaretPosition = state.typingState.getPositionFromCharIndex(displayIndex);
    }

    const keymapConfig = config.getKeymap();
    const tapeMode = keymapConfig.tapeMode || 'off';
    const useTape = (tapeMode === 'letter' || tapeMode === 'word') && typeof state.typingState.getTapeLength === 'function';
    if (useTape) {
      const cols = process.stdout.columns || 80;
      const fullWidth = Math.max(20, cols - 2 - 4);
      const tapeWidthPct = Math.max(50, Math.min(100, keymapConfig.tapeMargin ?? 75)) / 100;
      const viewportWidth = Math.max(20, Math.floor(fullWidth * tapeWidthPct));
      const caretIndex = state.typingState.getLogicalCaretCharIndex ? state.typingState.getLogicalCaretCharIndex() : 0;
      const tapeLength = state.typingState.getTapeLength();
      const maxScroll = Math.max(0, tapeLength - viewportWidth);
      state.tapeScrollTarget = Math.max(0, Math.min(caretIndex - Math.floor(viewportWidth * 0.5), maxScroll));
      const smooth = 0.25;
      state.tapeScrollOffset += (state.tapeScrollTarget - state.tapeScrollOffset) * smooth;
    }

    const displayIndex = state.typingState.getLogicalCaretCharIndex && state.typingState.getPositionFromCharIndex
      ? Math.round(state.displayCaretCharIndex)
      : 0;

    onRenderTest(state, config, displayIndex, mainCaretPosition, null, useTape);
  }

  function handleKey(event, config, constants) {
    const {
      MAIN_MENU_OPTIONS,
      TIME_OPTIONS,
      WORD_OPTIONS,
      SETTINGS_CATEGORIES,
      BEHAVIOR_OPTIONS,
      APPEARANCE_OPTIONS,
      KEYMAP_OPTIONS,
      THEME_PRESET_NAMES,
      THEME_COLOR_OPTIONS,
      THEME_COLOR_PALETTE,
      getSettingsOptionCount,
    } = constants;

    if (event.type === 'exit') {
      return { action: 'exit' };
    }

    if (event.type === 'char' && (event.char === '\u001b' || event.char === '\x1b')) {
      event = { type: 'escape' };
    }

    if (state.screen === SCREENS.MAIN_MENU) {
      if (event.type === 'char' && (event.char === 'q' || event.char === 'Q')) {
        return { action: 'exit' };
      }
      if (event.type === 'arrowUp') {
        state.mainMenuIndex = (state.mainMenuIndex - 1 + MAIN_MENU_OPTIONS.length) % MAIN_MENU_OPTIONS.length;
        return { action: 'render' };
      }
      if (event.type === 'arrowDown') {
        state.mainMenuIndex = (state.mainMenuIndex + 1) % MAIN_MENU_OPTIONS.length;
        return { action: 'render' };
      }
      if (event.type === 'enter') {
        if (state.mainMenuIndex === 4) {
          state.screen = SCREENS.SETTINGS;
          state.settingsCategoryIndex = 0;
          state.settingsPanelFocus = 'left';
          state.settingsRightOptionIndex = 0;
          return { action: 'render' };
        }
        if (state.mainMenuIndex === 0) {
          state.screen = SCREENS.TIME_SUB;
          state.timeSubIndex = 0;
          state.timeLimitSeconds = null;
          state.wordLimit = null;
          state.customText = null;
          return { action: 'render' };
        }
        if (state.mainMenuIndex === 1) {
          state.screen = SCREENS.WORDS_SUB;
          state.wordsSubIndex = 0;
          state.timeLimitSeconds = null;
          state.wordLimit = null;
          state.customText = null;
          return { action: 'render' };
        }
        if (state.mainMenuIndex === 2) {
          state.timeLimitSeconds = null;
          state.wordLimit = null;
          state.customText = null;
          startTest(config, constants);
          return { action: 'startTest' };
        }
        state.screen = SCREENS.CUSTOM_INPUT;
        state.customInputText = '';
        state.timeLimitSeconds = null;
        state.wordLimit = null;
        return { action: 'render' };
      }
      return null;
    }

    if (state.screen === SCREENS.TIME_SUB) {
      if (event.type === 'escape') {
        goToMainMenu();
        return { action: 'render' };
      }
      if (event.type === 'arrowUp') {
        state.timeSubIndex = (state.timeSubIndex - 1 + TIME_OPTIONS.length) % TIME_OPTIONS.length;
        return { action: 'render' };
      }
      if (event.type === 'arrowDown') {
        state.timeSubIndex = (state.timeSubIndex + 1) % TIME_OPTIONS.length;
        return { action: 'render' };
      }
      if (event.type === 'enter') {
        state.timeLimitSeconds = TIME_OPTIONS[state.timeSubIndex];
        state.wordLimit = null;
        state.customText = null;
        startTest(config, constants);
        return { action: 'startTest' };
      }
      return null;
    }

    if (state.screen === SCREENS.WORDS_SUB) {
      if (event.type === 'escape') {
        goToMainMenu();
        return { action: 'render' };
      }
      if (event.type === 'arrowUp') {
        state.wordsSubIndex = (state.wordsSubIndex - 1 + WORD_OPTIONS.length) % WORD_OPTIONS.length;
        return { action: 'render' };
      }
      if (event.type === 'arrowDown') {
        state.wordsSubIndex = (state.wordsSubIndex + 1) % WORD_OPTIONS.length;
        return { action: 'render' };
      }
      if (event.type === 'enter') {
        state.wordLimit = WORD_OPTIONS[state.wordsSubIndex];
        state.timeLimitSeconds = null;
        state.customText = null;
        startTest(config, constants);
        return { action: 'startTest' };
      }
      return null;
    }

    if (state.screen === SCREENS.CUSTOM_INPUT) {
      if (event.type === 'escape') {
        state.customInputText = '';
        goToMainMenu();
        return { action: 'render' };
      }
      if (event.type === 'enter') {
        const text = state.customInputText.trim();
        if (text.length > 0) {
          state.customText = text;
          state.timeLimitSeconds = null;
          state.wordLimit = null;
          state.screen = SCREENS.TEST;
          startTest(config, constants);
          return { action: 'startTest' };
        }
        return null;
      }
      if (event.type === 'backspace') {
        state.customInputText = state.customInputText.slice(0, -1);
        return { action: 'render' };
      }
      if (event.type === 'char') {
        state.customInputText += event.char;
        return { action: 'render' };
      }
      return null;
    }

    if (state.screen === SCREENS.SETTINGS) {
      if (event.type === 'escape') {
        goToMainMenu();
        return { action: 'render' };
      }
      if (event.type === 'char' && event.char === 'r') {
        if (configManager && typeof configManager.reset === 'function') {
          configManager.reset();
          config.clearConfigCache();
        }
        return { action: 'render' };
      }
      const navUp = event.type === 'arrowUp' || (event.type === 'char' && event.char === 'k');
      const navDown = event.type === 'arrowDown' || (event.type === 'char' && event.char === 'j');
      const isBehaviorCategory = state.settingsCategoryIndex === 0;
      const isAppearanceCategory = state.settingsCategoryIndex === 1;
      const isKeymapCategory = state.settingsCategoryIndex === 2;
      const isThemeCategory = state.settingsCategoryIndex === 3;

      if (event.type === 'arrowLeft' && state.settingsPanelFocus === 'right' && isBehaviorCategory && BEHAVIOR_OPTIONS[state.settingsRightOptionIndex]) {
        const opt = BEHAVIOR_OPTIONS[state.settingsRightOptionIndex];
        const behavior = config.getBehavior();
        const idx = opt.values.indexOf(behavior[opt.key]);
        const valueIdx = idx >= 0 ? (idx - 1 + opt.values.length) % opt.values.length : 0;
        config.setBehavior(opt.key, opt.values[valueIdx]);
        config.save();
        return { action: 'render' };
      }
      if (event.type === 'arrowRight' && state.settingsPanelFocus === 'right' && isBehaviorCategory && BEHAVIOR_OPTIONS[state.settingsRightOptionIndex]) {
        const opt = BEHAVIOR_OPTIONS[state.settingsRightOptionIndex];
        const behavior = config.getBehavior();
        const idx = opt.values.indexOf(behavior[opt.key]);
        const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
        config.setBehavior(opt.key, opt.values[valueIdx]);
        config.save();
        return { action: 'render' };
      }
      if (event.type === 'arrowLeft' && state.settingsPanelFocus === 'right' && isAppearanceCategory && APPEARANCE_OPTIONS[state.settingsRightOptionIndex]) {
        const opt = APPEARANCE_OPTIONS[state.settingsRightOptionIndex];
        const appearance = config.getAppearance();
        if (opt.type === 'slider') {
          const value = appearance[opt.key] ?? opt.min;
          const newValue = Math.max(opt.min, value - (opt.step || 5));
          config.setAppearance(opt.key, newValue);
        } else {
          const idx = opt.values.indexOf(appearance[opt.key]);
          const valueIdx = idx >= 0 ? (idx - 1 + opt.values.length) % opt.values.length : 0;
          config.setAppearance(opt.key, opt.values[valueIdx]);
        }
        config.save();
        return { action: 'render' };
      }
      if (event.type === 'arrowRight' && state.settingsPanelFocus === 'right' && isAppearanceCategory && APPEARANCE_OPTIONS[state.settingsRightOptionIndex]) {
        const opt = APPEARANCE_OPTIONS[state.settingsRightOptionIndex];
        const appearance = config.getAppearance();
        if (opt.type === 'slider') {
          const value = appearance[opt.key] ?? opt.min;
          const newValue = Math.min(opt.max, value + (opt.step || 5));
          config.setAppearance(opt.key, newValue);
        } else {
          const idx = opt.values.indexOf(appearance[opt.key]);
          const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
          config.setAppearance(opt.key, opt.values[valueIdx]);
        }
        config.save();
        return { action: 'render' };
      }
      if (event.type === 'arrowLeft' && state.settingsPanelFocus === 'right' && isKeymapCategory && KEYMAP_OPTIONS[state.settingsRightOptionIndex]) {
        const opt = KEYMAP_OPTIONS[state.settingsRightOptionIndex];
        const keymap = config.getKeymap();
        if (opt.type === 'slider') {
          const value = keymap[opt.key] ?? opt.min;
          const newValue = Math.max(opt.min, value - (opt.step || 5));
          config.setKeymap(opt.key, newValue);
        } else {
          const idx = opt.values.indexOf(keymap[opt.key]);
          const valueIdx = idx >= 0 ? (idx - 1 + opt.values.length) % opt.values.length : 0;
          config.setKeymap(opt.key, opt.values[valueIdx]);
        }
        config.save();
        return { action: 'render' };
      }
      if (event.type === 'arrowRight' && state.settingsPanelFocus === 'right' && isKeymapCategory && KEYMAP_OPTIONS[state.settingsRightOptionIndex]) {
        const opt = KEYMAP_OPTIONS[state.settingsRightOptionIndex];
        const keymap = config.getKeymap();
        if (opt.type === 'slider') {
          const value = keymap[opt.key] ?? opt.min;
          const newValue = Math.min(opt.max, value + (opt.step || 5));
          config.setKeymap(opt.key, newValue);
        } else {
          const idx = opt.values.indexOf(keymap[opt.key]);
          const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
          config.setKeymap(opt.key, opt.values[valueIdx]);
        }
        config.save();
        return { action: 'render' };
      }
      if (event.type === 'arrowLeft' && state.settingsPanelFocus === 'right' && isThemeCategory) {
        const theme = config.getTheme();
        if (state.settingsRightOptionIndex === 0) {
          const idx = THEME_PRESET_NAMES.indexOf(theme.activePreset);
          const newIdx = (idx - 1 + THEME_PRESET_NAMES.length) % THEME_PRESET_NAMES.length;
          config.setThemePreset(THEME_PRESET_NAMES[newIdx]);
        } else if (theme.activePreset === 'custom' && THEME_COLOR_OPTIONS[state.settingsRightOptionIndex - 1]) {
          const opt = THEME_COLOR_OPTIONS[state.settingsRightOptionIndex - 1];
          const current = (theme.custom && theme.custom[opt.key]) || '#1a1b26';
          const palIdx = THEME_COLOR_PALETTE.findIndex((c) => c.toLowerCase() === (current || '').toLowerCase());
          const newIdx = palIdx < 0 ? THEME_COLOR_PALETTE.length - 1 : (palIdx - 1 + THEME_COLOR_PALETTE.length) % THEME_COLOR_PALETTE.length;
          config.setCustomThemeColor(opt.key, THEME_COLOR_PALETTE[newIdx]);
        }
        config.save();
        return { action: 'render' };
      }
      if (event.type === 'arrowRight' && state.settingsPanelFocus === 'right' && isThemeCategory) {
        const theme = config.getTheme();
        if (state.settingsRightOptionIndex === 0) {
          const idx = THEME_PRESET_NAMES.indexOf(theme.activePreset);
          const newIdx = (idx + 1) % THEME_PRESET_NAMES.length;
          config.setThemePreset(THEME_PRESET_NAMES[newIdx]);
        } else if (theme.activePreset === 'custom' && THEME_COLOR_OPTIONS[state.settingsRightOptionIndex - 1]) {
          const opt = THEME_COLOR_OPTIONS[state.settingsRightOptionIndex - 1];
          const current = (theme.custom && theme.custom[opt.key]) || '#1a1b26';
          const palIdx = THEME_COLOR_PALETTE.findIndex((c) => c.toLowerCase() === (current || '').toLowerCase());
          const newIdx = palIdx < 0 ? 0 : (palIdx + 1) % THEME_COLOR_PALETTE.length;
          config.setCustomThemeColor(opt.key, THEME_COLOR_PALETTE[newIdx]);
        }
        config.save();
        return { action: 'render' };
      }
      if (event.type === 'tab') {
        state.settingsPanelFocus = state.settingsPanelFocus === 'left' ? 'right' : 'left';
        if (state.settingsPanelFocus === 'right') {
          const n = getSettingsOptionCount(state.settingsCategoryIndex, state.settingsCategoryIndex === 3 ? config.getTheme() : undefined);
          state.settingsRightOptionIndex = Math.min(state.settingsRightOptionIndex, n - 1);
        }
        return { action: 'render' };
      }
      if (navUp) {
        if (state.settingsPanelFocus === 'left') {
          state.settingsCategoryIndex = (state.settingsCategoryIndex - 1 + SETTINGS_CATEGORIES.length) % SETTINGS_CATEGORIES.length;
          const n = getSettingsOptionCount(state.settingsCategoryIndex, state.settingsCategoryIndex === 3 ? config.getTheme() : undefined);
          state.settingsRightOptionIndex = Math.min(state.settingsRightOptionIndex, n - 1);
        } else {
          const n = getSettingsOptionCount(state.settingsCategoryIndex, state.settingsCategoryIndex === 3 ? config.getTheme() : undefined);
          state.settingsRightOptionIndex = n ? (state.settingsRightOptionIndex - 1 + n) % n : 0;
        }
        return { action: 'render' };
      }
      if (navDown) {
        if (state.settingsPanelFocus === 'left') {
          state.settingsCategoryIndex = (state.settingsCategoryIndex + 1) % SETTINGS_CATEGORIES.length;
          const n = getSettingsOptionCount(state.settingsCategoryIndex, state.settingsCategoryIndex === 3 ? config.getTheme() : undefined);
          state.settingsRightOptionIndex = Math.min(state.settingsRightOptionIndex, n - 1);
        } else {
          const n = getSettingsOptionCount(state.settingsCategoryIndex, state.settingsCategoryIndex === 3 ? config.getTheme() : undefined);
          state.settingsRightOptionIndex = n ? (state.settingsRightOptionIndex + 1) % n : 0;
        }
        return { action: 'render' };
      }
      if (event.type === 'enter') {
        if (state.settingsPanelFocus === 'left') {
          state.settingsRightOptionIndex = 0;
          state.settingsPanelFocus = 'right';
        } else if (isBehaviorCategory) {
          const opt = BEHAVIOR_OPTIONS[state.settingsRightOptionIndex];
          if (opt) {
            const behavior = config.getBehavior();
            const idx = opt.values.indexOf(behavior[opt.key]);
            const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
            config.setBehavior(opt.key, opt.values[valueIdx]);
            config.save();
          }
        } else if (isAppearanceCategory) {
          const opt = APPEARANCE_OPTIONS[state.settingsRightOptionIndex];
          if (opt) {
            const appearance = config.getAppearance();
            if (opt.type === 'slider') {
              const value = appearance[opt.key] ?? opt.min;
              const newValue = Math.min(opt.max, value + (opt.step || 5));
              config.setAppearance(opt.key, newValue);
            } else {
              const idx = opt.values.indexOf(appearance[opt.key]);
              const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
              config.setAppearance(opt.key, opt.values[valueIdx]);
            }
            config.save();
          }
        } else if (isKeymapCategory) {
          const opt = KEYMAP_OPTIONS[state.settingsRightOptionIndex];
          if (opt) {
            const keymap = config.getKeymap();
            if (opt.type === 'slider') {
              const value = keymap[opt.key] ?? opt.min;
              const newValue = Math.min(opt.max, value + (opt.step || 5));
              config.setKeymap(opt.key, newValue);
            } else {
              const idx = opt.values.indexOf(keymap[opt.key]);
              const valueIdx = idx >= 0 ? (idx + 1) % opt.values.length : 0;
              config.setKeymap(opt.key, opt.values[valueIdx]);
            }
            config.save();
          }
        } else if (isThemeCategory) {
          const theme = config.getTheme();
          if (state.settingsRightOptionIndex === 0) {
            const idx = THEME_PRESET_NAMES.indexOf(theme.activePreset);
            const newIdx = (idx + 1) % THEME_PRESET_NAMES.length;
            config.setThemePreset(THEME_PRESET_NAMES[newIdx]);
          } else if (theme.activePreset === 'custom' && THEME_COLOR_OPTIONS[state.settingsRightOptionIndex - 1]) {
            const opt = THEME_COLOR_OPTIONS[state.settingsRightOptionIndex - 1];
            const current = (theme.custom && theme.custom[opt.key]) || '#1a1b26';
            const palIdx = THEME_COLOR_PALETTE.findIndex((c) => c.toLowerCase() === (current || '').toLowerCase());
            const newIdx = palIdx < 0 ? 0 : (palIdx + 1) % THEME_COLOR_PALETTE.length;
            config.setCustomThemeColor(opt.key, THEME_COLOR_PALETTE[newIdx]);
          }
          config.save();
        } else {
          if (!state.settingsOptionStates[state.settingsCategoryIndex]) state.settingsOptionStates[state.settingsCategoryIndex] = [];
          const opts = state.settingsOptionStates[state.settingsCategoryIndex];
          opts[state.settingsRightOptionIndex] = !opts[state.settingsRightOptionIndex];
        }
        return { action: 'render' };
      }
      return null;
    }

    if (state.screen === SCREENS.RESULTS) {
      if (event.type === 'enter') {
        startTest(config, constants);
        return { action: 'startTest' };
      }
      if (event.type === 'escape') {
        state.screen = SCREENS.MAIN_MENU;
        goToMainMenu();
        return { action: 'render' };
      }
      return null;
    }

    if (state.screen === SCREENS.TEST) {
      const behavior = config.getBehavior();

      if (event.type === 'shiftEnter') {
        if (state.testMode === 'zen') {
          state.completed = true;
          stopRenderInterval();
          showResults(config);
          return { action: 'showResults' };
        }
      }
      if (event.type === 'enter') {
        if (state.testMode === 'zen') {
          state.completed = true;
          stopRenderInterval();
          showResults(config);
          return { action: 'showResults' };
        }
        if (state.testMode !== 'custom' && behavior.quickRestart === 'enter') {
          startTest(config, constants);
          return { action: 'startTest' };
        }
        if (state.started && !state.completed) {
          return null;
        }
      }
      if (event.type === 'tab') {
        if (state.testMode !== 'custom' && behavior.quickRestart === 'tab') {
          startTest(config, constants);
          return { action: 'startTest' };
        }
        if (state.started && !state.completed) {
          return null;
        }
      }
      if (event.type === 'escape') {
        stopRenderInterval();
        goToMainMenu();
        return { action: 'render' };
      }

      if (state.testMode === 'zen') {
        if (!state.started) {
          state.started = true;
          state.stats.start();
        }
        if (event.type === 'backspace') {
          state.typingState.handleBackspace(state.stats, { allowPreviousWord: true });
          return { action: 'tick' };
        }
        if (event.type === 'char') {
          state.lastKeyPressed = event.char;
          if (event.char === ' ') {
            state.typingState.handleSpace(state.stats);
          } else {
            state.typingState.handleCharacter(event.char, state.stats);
          }
          return { action: 'tick' };
        }
        return null;
      }

      if (state.completed) return null;
      if (!state.started) {
        state.started = true;
        state.stats.start();
      }
      if (event.type === 'backspace') {
        if (behavior.confidenceMode !== 'max') {
          const allowPreviousWord =
            typeof state.typingState.canBackspaceToPreviousWord === 'function'
              ? state.typingState.canBackspaceToPreviousWord()
              : false;
          state.typingState.handleBackspace(state.stats, { allowPreviousWord });
        }
        return { action: 'tick' };
      }
      if (event.type === 'char') {
        state.lastKeyPressed = event.char;
        if (event.char === ' ') {
          if (behavior.testDifficulty === 'expert' && state.typingState.currentWordHasErrors && state.typingState.currentWordHasErrors()) {
            state.completed = true;
            stopRenderInterval();
            showResults(config);
            return { action: 'showResults' };
          }
          state.typingState.handleSpace(state.stats);
          if (typeof state.typingState.getLastRemovedTapeChars === 'function') {
            const removed = state.typingState.getLastRemovedTapeChars();
            if (removed > 0) {
              state.tapeScrollOffset = Math.max(0, state.tapeScrollOffset - removed);
              state.tapeScrollTarget = Math.max(0, state.tapeScrollTarget - removed);
            }
          }
          return { action: 'tick' };
        }
        const result = state.typingState.handleCharacter(event.char, state.stats);
        if (!result.correct && behavior.testDifficulty === 'master') {
          state.completed = true;
          stopRenderInterval();
          showResults(config);
          return { action: 'showResults' };
        }
        const elapsed = state.stats.getElapsedSeconds();
        const timeLimit = state.timeLimitSeconds ?? 0;
        if (
          (state.testMode === 'time' && elapsed >= timeLimit) ||
          state.typingState.isTestComplete(state.timeLimitSeconds, elapsed)
        ) {
          state.completed = true;
          stopRenderInterval();
          showResults(config);
          return { action: 'showResults' };
        }
        return { action: 'tick' };
      }
    }

    return null;
  }

  function getViewState(config) {
    let pbWpm = null;
    try {
      if (configManager) {
        const pb = configManager.get('personalBests');
        if (pb && typeof pb.wpm === 'number') pbWpm = pb.wpm;
      }
    } catch (_) {}

    return {
      state,
      config,
      pbWpm,
    };
  }

  return {
    get state() { return state; },
    get screen() { return state.screen; },
    SCREENS,
    goToMainMenu,
    startTest,
    showResults,
    tick,
    handleKey,
    getViewState,
    stopRenderInterval,
    setRenderIntervalId(id) { state.renderIntervalId = id; },
    getRenderIntervalId() { return state.renderIntervalId; },
  };
}

module.exports = { createAppState, SCREENS };
