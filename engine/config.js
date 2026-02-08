'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'terminaltype.json');

let configManager = null;
function getConfigManager() {
  if (configManager === null) {
    try {
      configManager = require('../core/configManager').configManager;
    } catch (_) {
      configManager = false;
    }
  }
  return configManager || null;
}
function usePersistentConfig() {
  const cm = getConfigManager();
  return cm && cm.getConfigPath() !== null;
}

const DEFAULT_BEHAVIOR = {
  quickRestart: 'tab',
  testDifficulty: 'normal',
  blindMode: 'off',
  freedomMode: 'off',
  confidenceMode: 'off',
};

const DEFAULT_CARET = {
  caretStyle: 'underline',
  paceCaret: 'off',
  paceCaretStyle: '|',
  paceCaretCustomWpm: 40,
};

const DEFAULT_APPEARANCE = {
  liveProgressBar: 'bar',
  liveSpeed: 'text',
  liveAccuracy: 'text',
  liveBurst: 'off',
  tapeMode: 'off',
  tapeMargin: 75,
};

const DEFAULT_KEYMAP = {
  keymapMode: 'react',
  keymapStyle: 'staggered',
};

const THEME_PRESETS = {
  default: {
    bg: '#1a1b26',
    main: '#9ece6a',
    sub: '#5c5c70',
    text: '#cccccc',
    error: '#e03e3e',
    errorExtra: '#ff6b6b',
    caret: '#ffffff',
    typed: '#9ece6a',
  },
  serika: {
    bg: '#e9e9e0',
    main: '#e9b873',
    sub: '#8b7355',
    text: '#323437',
    error: '#c23c3c',
    errorExtra: '#d44f4f',
    caret: '#323437',
    typed: '#323437',
  },
  dark: {
    bg: '#0d1117',
    main: '#58a6ff',
    sub: '#6e7681',
    text: '#c9d1d9',
    error: '#f85149',
    errorExtra: '#ff7b72',
    caret: '#c9d1d9',
    typed: '#3fb950',
  },
  light: {
    bg: '#ffffff',
    main: '#0969da',
    sub: '#656d76',
    text: '#1f2328',
    error: '#cf222e',
    errorExtra: '#d1242f',
    caret: '#1f2328',
    typed: '#1a7f37',
  },
  nord: {
    bg: '#2e3440',
    main: '#88c0d0',
    sub: '#4c566a',
    text: '#d8dee9',
    error: '#bf616a',
    errorExtra: '#d08770',
    caret: '#d8dee9',
    typed: '#a3be8c',
  },
};

const THEME_COLOR_KEYS = ['bg', 'main', 'sub', 'text', 'error', 'errorExtra', 'caret', 'typed'];

const DEFAULT_THEME = {
  activePreset: 'default',
  custom: THEME_COLOR_KEYS.reduce((acc, k) => {
    acc[k] = THEME_PRESETS.default[k];
    return acc;
  }, {}),
};

const MAX_RESULTS_HISTORY = 100;
let cached = null;

function clearConfigCache() {
  cached = null;
}

function getConfigPath() {
  if (usePersistentConfig()) return getConfigManager().getConfigPath();
  return CONFIG_PATH;
}

function mapFromPersistent(store) {
  if (!store || !store.settings) return null;
  const s = store.settings;
  const app = s.appearance || {};
  const behavior = { ...DEFAULT_BEHAVIOR, ...(s.behavior || {}) };
  const caret = { ...DEFAULT_CARET, ...(app.caret || {}) };
  const appearance = {
    ...DEFAULT_APPEARANCE,
    liveProgressBar: app.liveProgressBar ?? app.liveProgress ?? DEFAULT_APPEARANCE.liveProgressBar,
    liveSpeed: app.liveSpeed ?? DEFAULT_APPEARANCE.liveSpeed,
    liveAccuracy: app.liveAccuracy ?? DEFAULT_APPEARANCE.liveAccuracy,
    liveBurst: app.liveBurst ?? DEFAULT_APPEARANCE.liveBurst,
    tapeMode: app.tapeMode ?? DEFAULT_APPEARANCE.tapeMode,
    tapeMargin: app.tapeMargin ?? DEFAULT_APPEARANCE.tapeMargin,
  };
  let migrated = false;
  if (behavior.quickRestart === 'enter') {
    behavior.quickRestart = DEFAULT_BEHAVIOR.quickRestart;
    migrated = true;
  }
  if (appearance.tapeMargin === 100) {
    appearance.tapeMargin = DEFAULT_APPEARANCE.tapeMargin;
    migrated = true;
  }
  if (caret.caretStyle !== 'underline' && caret.caretStyle !== 'off') {
    caret.caretStyle = DEFAULT_CARET.caretStyle;
    migrated = true;
  }
  if (migrated) {
    const cm = getConfigManager();
    if (cm) {
      try {
        cm.set('settings.behavior', behavior);
        const app = store.settings.appearance || {};
        cm.set('settings.appearance', { ...app, tapeMargin: appearance.tapeMargin, caret: { ...(app.caret || {}), caretStyle: caret.caretStyle } });
      } catch (_) {}
    }
  }
  return {
    behavior,
    caret,
    appearance,
    keymap: {
      ...DEFAULT_KEYMAP,
      keymapMode: app.keymapMode ?? DEFAULT_KEYMAP.keymapMode,
      keymapStyle: app.keymapStyle ?? DEFAULT_KEYMAP.keymapStyle,
    },
    theme: {
      activePreset: (s.theme && (s.theme.preset ?? s.theme.activePreset)) || 'default',
      custom: { ...THEME_PRESETS.default, ...((s.theme && s.theme.custom) || {}) },
    },
    resultsHistory: (store.results || []).slice(0, MAX_RESULTS_HISTORY).map((r) => ({
      wpm: r.wpm,
      rawWpm: r.rawWpm,
      accuracy: r.accuracy,
      consistency: r.consistency,
      correctCharacters: (r.characters && r.characters.correct) ?? r.correctCharacters ?? 0,
      totalTypedCharacters: (r.characters && (r.characters.correct + (r.characters.incorrect ?? 0))) ?? r.totalTypedCharacters ?? 0,
      totalErrors: r.errors ?? r.totalErrors ?? (r.characters && r.characters.incorrect) ?? 0,
      testType: r.testType,
      durationSeconds: r.duration ?? r.durationSeconds ?? 0,
      timestamp: r.timestamp,
    })),
  };
}

function load() {
  if (cached) return cached;
  if (usePersistentConfig()) {
    const store = getConfigManager().get();
    const mapped = mapFromPersistent(store);
    if (mapped) {
      cached = mapped;
      return cached;
    }
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const data = JSON.parse(raw);
    cached = {
      behavior: { ...DEFAULT_BEHAVIOR, ...(data.behavior || {}) },
      caret: { ...DEFAULT_CARET, ...(data.caret || {}) },
      appearance: { ...DEFAULT_APPEARANCE, ...(data.appearance || {}) },
      keymap: { ...DEFAULT_KEYMAP, ...(data.keymap || {}) },
      theme: { ...DEFAULT_THEME, ...(data.theme || {}) },
      resultsHistory: Array.isArray(data.resultsHistory) ? data.resultsHistory : [],
    };
    if (cached.behavior.quickRestart === 'enter') cached.behavior.quickRestart = DEFAULT_BEHAVIOR.quickRestart;
    if (cached.appearance.tapeMargin === 100) cached.appearance.tapeMargin = DEFAULT_APPEARANCE.tapeMargin;
    if (cached.caret.caretStyle !== 'underline' && cached.caret.caretStyle !== 'off') cached.caret.caretStyle = DEFAULT_CARET.caretStyle;
    if (cached.theme.custom) {
      cached.theme.custom = { ...THEME_PRESETS.default, ...cached.theme.custom };
    }
  } catch (_) {
    cached = {
      behavior: { ...DEFAULT_BEHAVIOR },
      caret: { ...DEFAULT_CARET },
      appearance: { ...DEFAULT_APPEARANCE },
      keymap: { ...DEFAULT_KEYMAP },
      theme: { ...DEFAULT_THEME },
      resultsHistory: [],
    };
  }
  return cached;
}

function addResultToHistory(result) {
  if (usePersistentConfig()) {
    const cm = getConfigManager();
    const ok = cm.addResult({
      wpm: result.wpm,
      rawWpm: result.rawWpm,
      accuracy: result.accuracy,
      consistency: result.consistency,
      characters: {
        correct: result.correctCharacters,
        incorrect: result.totalErrors,
        extra: 0,
        missed: 0,
      },
      timestamp: typeof result.timestamp === 'number' ? result.timestamp : Date.now(),
      testType: result.testType,
      durationSeconds: result.durationSeconds,
      errors: result.totalErrors,
      correctCharacters: result.correctCharacters,
      totalTypedCharacters: result.totalTypedCharacters,
      totalErrors: result.totalErrors,
    });
    if (ok) {
      cached = null;
      load();
    }
    return;
  }
  const config = load();
  config.resultsHistory = config.resultsHistory || [];
  config.resultsHistory.unshift({
    wpm: result.wpm,
    rawWpm: result.rawWpm,
    accuracy: result.accuracy,
    consistency: result.consistency,
    correctCharacters: result.correctCharacters,
    totalTypedCharacters: result.totalTypedCharacters,
    totalErrors: result.totalErrors,
    testType: result.testType,
    durationSeconds: result.durationSeconds,
    timestamp: typeof result.timestamp === 'number' ? result.timestamp : Date.now(),
  });
  if (config.resultsHistory.length > MAX_RESULTS_HISTORY) {
    config.resultsHistory = config.resultsHistory.slice(0, MAX_RESULTS_HISTORY);
  }
  save();
}

function getResultsHistory() {
  return (load().resultsHistory || []).slice();
}

function getBehavior() {
  return { ...DEFAULT_BEHAVIOR, ...load().behavior };
}

function setBehavior(key, value) {
  const config = load();
  if (config.behavior[key] !== undefined) {
    config.behavior[key] = value;
    return true;
  }
  return false;
}

function getCaret() {
  return { ...DEFAULT_CARET, ...load().caret };
}

function setCaret(key, value) {
  const config = load();
  if (config.caret[key] !== undefined) {
    config.caret[key] = value;
    return true;
  }
  return false;
}

function getAppearance() {
  return { ...DEFAULT_APPEARANCE, ...load().appearance };
}

function setAppearance(key, value) {
  const config = load();
  if (config.appearance[key] !== undefined) {
    config.appearance[key] = value;
    return true;
  }
  return false;
}

function getKeymap() {
  const config = load();
  return {
    ...config.keymap,
    tapeMode: config.appearance.tapeMode ?? DEFAULT_APPEARANCE.tapeMode,
    tapeMargin: config.appearance.tapeMargin ?? DEFAULT_APPEARANCE.tapeMargin,
  };
}

function setKeymap(key, value) {
  const config = load();
  if (config.keymap[key] !== undefined) {
    config.keymap[key] = value;
    return true;
  }
  return false;
}

function getTheme() {
  const t = load().theme;
  return {
    activePreset: t.activePreset || 'default',
    custom: { ...(THEME_PRESETS.default), ...(t.custom || {}) },
  };
}

function getEffectiveTheme() {
  const t = load().theme;
  const preset = t.activePreset || 'default';
  if (preset === 'custom' || !THEME_PRESETS[preset]) {
    return { ...THEME_PRESETS.default, ...(t.custom || {}) };
  }
  return { ...THEME_PRESETS[preset] };
}

function setThemePreset(preset) {
  const config = load();
  if (THEME_PRESETS[preset] || preset === 'custom') {
    config.theme.activePreset = preset;
    return true;
  }
  return false;
}

function setCustomThemeColor(key, value) {
  const config = load();
  if (THEME_COLOR_KEYS.includes(key) && typeof value === 'string') {
    config.theme.custom[key] = value;
    config.theme.activePreset = 'custom';
    return true;
  }
  return false;
}

function save() {
  const config = load();
  if (usePersistentConfig()) {
    const cm = getConfigManager();
    const ok =
      cm.set('settings.behavior', config.behavior) &&
      cm.set('settings.appearance', {
        caret: config.caret,
        liveProgressBar: config.appearance.liveProgressBar,
        liveSpeed: config.appearance.liveSpeed,
        liveAccuracy: config.appearance.liveAccuracy,
        liveBurst: config.appearance.liveBurst,
        tapeMode: config.appearance.tapeMode,
        tapeMargin: config.appearance.tapeMargin,
        keymapMode: config.keymap.keymapMode,
        keymapStyle: config.keymap.keymapStyle,
      }) &&
      cm.set('settings.theme', {
        preset: config.theme.activePreset,
        custom: config.theme.custom,
      });
    return ok;
  }
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const toWrite = {
      behavior: config.behavior,
      caret: config.caret,
      appearance: config.appearance,
      keymap: config.keymap,
      theme: config.theme,
      resultsHistory: config.resultsHistory || [],
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(toWrite, null, 2), 'utf8');
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  getConfigPath,
  load,
  clearConfigCache,
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
  save,
  addResultToHistory,
  getResultsHistory,
  DEFAULT_BEHAVIOR,
  DEFAULT_CARET,
  DEFAULT_APPEARANCE,
  DEFAULT_KEYMAP,
  THEME_PRESETS,
  THEME_COLOR_KEYS,
};
