'use strict';

const CONFIG_VERSION = 1;
const MAX_RESULTS = 500;

const DEFAULT_SETTINGS = {
  behavior: {
    quickRestart: 'tab',
    testDifficulty: 'normal',
    blindMode: 'off',
    freedomMode: 'off',
    confidenceMode: 'off',
  },
  appearance: {
    liveProgressBar: 'bar',
    liveSpeed: 'text',
    liveAccuracy: 'text',
    liveBurst: 'off',
    tapeMode: 'off',
    tapeMargin: 75,
    keymapMode: 'react',
    keymapStyle: 'staggered',
  },
  theme: {
    preset: 'default',
    custom: {
      bg: '#1a1b26',
      main: '#9ece6a',
      sub: '#5c5c70',
      text: '#cccccc',
      error: '#e03e3e',
      errorExtra: '#ff6b6b',
      caret: '#ffffff',
      typed: '#9ece6a',
    },
  },
  test: {
    mode: 'time',
    timeLimit: 30,
    wordCount: 50,
    language: 'en',
  },
};

const DEFAULT_RESULTS = [];
const DEFAULT_PERSONAL_BESTS = { wpm: 0, accuracy: 0, consistency: 0 };
const DEFAULT_STATS = { totalTests: 0, totalTime: 0, averageWpm: 0, averageAccuracy: 0 };

const DEFAULT_STORE = {
  _version: CONFIG_VERSION,
  settings: deepClone(DEFAULT_SETTINGS),
  results: [],
  personalBests: { ...DEFAULT_PERSONAL_BESTS },
  stats: { ...DEFAULT_STATS },
};

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const out = {};
  for (const k of Object.keys(obj)) out[k] = deepClone(obj[k]);
  return out;
}

function deepMerge(target, source) {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) return source;
  const out = { ...target };
  for (const k of Object.keys(source)) {
    if (source[k] != null && typeof source[k] === 'object' && !Array.isArray(source[k])) {
      out[k] = deepMerge(out[k] || {}, source[k]);
    } else {
      out[k] = source[k];
    }
  }
  return out;
}

function validateBehavior(b) {
  if (!b || typeof b !== 'object') return false;
  const keys = ['quickRestart', 'testDifficulty', 'blindMode', 'freedomMode', 'confidenceMode'];
  return keys.every((k) => typeof b[k] === 'string');
}

function validateAppearance(a) {
  if (!a || typeof a !== 'object') return false;
  return (
    typeof (a.liveProgressBar ?? a.liveProgress) === 'string' &&
    typeof (a.liveSpeed ?? '') === 'string' &&
    typeof (a.liveAccuracy ?? '') === 'string' &&
    typeof (a.liveBurst ?? '') === 'string'
  );
}

function validateTheme(t) {
  if (!t || typeof t !== 'object') return false;
  return typeof (t.preset ?? t.activePreset) === 'string' && (t.custom === undefined || (t.custom && typeof t.custom === 'object'));
}

function validateTest(t) {
  if (!t || typeof t !== 'object') return false;
  return (
    typeof (t.mode ?? '') === 'string' &&
    typeof (t.timeLimit ?? 0) === 'number' &&
    typeof (t.wordCount ?? 0) === 'number'
  );
}

function validateResult(r) {
  if (!r || typeof r !== 'object') return false;
  return (
    typeof (r.wpm ?? r.rawWpm ?? 0) === 'number' &&
    (r.timestamp === undefined || typeof r.timestamp === 'number')
  );
}

function validatePersonalBests(pb) {
  if (!pb || typeof pb !== 'object') return false;
  return typeof (pb.wpm ?? 0) === 'number' && typeof (pb.accuracy ?? 0) === 'number' && typeof (pb.consistency ?? 0) === 'number';
}

function validateStats(s) {
  if (!s || typeof s !== 'object') return false;
  return (
    typeof (s.totalTests ?? 0) === 'number' &&
    typeof (s.totalTime ?? 0) === 'number' &&
    typeof (s.averageWpm ?? 0) === 'number' &&
    typeof (s.averageAccuracy ?? 0) === 'number'
  );
}

function validateStore(data) {
  if (!data || typeof data !== 'object') return false;
  if (!validateBehavior(data.settings?.behavior)) return false;
  if (!validateAppearance(data.settings?.appearance)) return false;
  if (!validateTheme(data.settings?.theme)) return false;
  if (!validateTest(data.settings?.test)) return false;
  if (!Array.isArray(data.results)) return false;
  if (!data.results.every(validateResult)) return false;
  if (!validatePersonalBests(data.personalBests)) return false;
  if (!validateStats(data.stats)) return false;
  return true;
}

function normalizeResult(result) {
  const chars = result.characters || {};
  return {
    wpm: Number(result.wpm) || 0,
    rawWpm: Number(result.rawWpm) || 0,
    accuracy: Number(result.accuracy) || 0,
    consistency: Number(result.consistency) ?? 0,
    characters: {
      correct: Number(chars.correct ?? result.correctCharacters) || 0,
      incorrect: Number(chars.incorrect ?? result.totalErrors) || 0,
      extra: Number(chars.extra) || 0,
      missed: Number(chars.missed) || 0,
    },
    timestamp: typeof result.timestamp === 'number' ? result.timestamp : Date.now(),
    testType: String(result.testType ?? result.testMode ?? ''),
    duration: Number(result.durationSeconds ?? result.duration ?? 0) || 0,
    errors: Number(result.errors ?? result.totalErrors) || 0,
  };
}

function createConfigManager() {
  let store = null;
  let lastLoadFailed = false;
  let conf = null;

  async function init() {
    if (conf !== null) return;
    try {
      const ConfClass = (await import('conf')).default;
      conf = new ConfClass({
        projectName: 'monkeytype-tui',
        defaults: DEFAULT_STORE,
        clearInvalidConfig: false,
      });
      store = null;
      load();
    } catch (err) {
      store = deepClone(DEFAULT_STORE);
    }
  }

  function load() {
    if (store !== null && !lastLoadFailed) return store;
    if (conf === null) {
      store = deepClone(DEFAULT_STORE);
      return store;
    }
    try {
      const raw = conf.store;
      if (!raw || typeof raw !== 'object') {
        store = deepClone(DEFAULT_STORE);
        lastLoadFailed = false;
        return store;
      }
      const data = { ...raw };
      if (!validateStore(data)) {
        store = deepClone(DEFAULT_STORE);
        conf.store = store;
        lastLoadFailed = true;
        return store;
      }
      const version = data._version ?? 0;
      if (version < CONFIG_VERSION) {
        data._version = CONFIG_VERSION;
        data.settings = deepMerge(DEFAULT_SETTINGS, data.settings || {});
        data.personalBests = { ...DEFAULT_PERSONAL_BESTS, ...(data.personalBests || {}) };
        data.stats = { ...DEFAULT_STATS, ...(data.stats || {}) };
        if (!Array.isArray(data.results)) data.results = [];
        conf.store = data;
      }
      store = data;
      lastLoadFailed = false;
      return store;
    } catch (err) {
      store = deepClone(DEFAULT_STORE);
      try {
        conf.store = store;
      } catch (_) {}
      lastLoadFailed = true;
      return store;
    }
  }

  function get(key) {
    const data = load();
    if (key === undefined || key === '') return deepClone(data);
    const parts = key.split('.');
    let cur = data;
    for (const p of parts) {
      if (cur === undefined || cur === null) return undefined;
      cur = cur[p];
    }
    return cur === undefined ? undefined : deepClone(cur);
  }

  function set(key, value) {
    const data = load();
    if (key === undefined || key === '') return false;
    const parts = key.split('.');
    if (parts.length === 0) return false;
    let cur = data;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (cur[p] === undefined || typeof cur[p] !== 'object' || Array.isArray(cur[p])) {
        cur[p] = {};
      }
      cur = cur[p];
    }
    const last = parts[parts.length - 1];
    cur[last] = value === undefined ? undefined : deepClone(value);
    if (conf === null) return true;
    try {
      conf.store = data;
      return true;
    } catch (err) {
      return false;
    }
  }

  function reset() {
    store = deepClone(DEFAULT_STORE);
    if (conf === null) return true;
    try {
      conf.store = store;
      lastLoadFailed = false;
      return true;
    } catch (err) {
      return false;
    }
  }

  function addResult(result) {
    const data = load();
    const norm = normalizeResult(result);
    if (!validateResult(norm)) return false;
    data.results = data.results || [];
    data.results.unshift(norm);
    if (data.results.length > MAX_RESULTS) data.results = data.results.slice(0, MAX_RESULTS);

    const pb = data.personalBests || { ...DEFAULT_PERSONAL_BESTS };
    if (norm.wpm > (pb.wpm || 0)) pb.wpm = norm.wpm;
    if (norm.accuracy > (pb.accuracy || 0)) pb.accuracy = norm.accuracy;
    if (norm.consistency > (pb.consistency || 0)) pb.consistency = norm.consistency;
    data.personalBests = pb;

    const stats = data.stats || { ...DEFAULT_STATS };
    const n = data.results.length;
    const totalTime = (stats.totalTime || 0) + norm.duration;
    const totalWpm = (stats.averageWpm || 0) * (n - 1) + norm.wpm;
    const totalAcc = (stats.averageAccuracy || 0) * (n - 1) + norm.accuracy;
    data.stats = {
      totalTests: n,
      totalTime,
      averageWpm: n > 0 ? totalWpm / n : 0,
      averageAccuracy: n > 0 ? totalAcc / n : 0,
    };

    if (conf === null) return false;
    try {
      conf.store = data;
      return true;
    } catch (err) {
      return false;
    }
  }

  function getConfigPath() {
    return conf ? conf.path : null;
  }

  function didLastLoadFail() {
    load();
    return lastLoadFailed;
  }

  return {
    init,
    get,
    set,
    reset,
    addResult,
    getConfigPath,
    didLastLoadFail,
    DEFAULT_STORE: deepClone(DEFAULT_STORE),
    CONFIG_VERSION,
  };
}

const singleton = createConfigManager();

module.exports = {
  configManager: singleton,
  createConfigManager,
  DEFAULT_SETTINGS: deepClone(DEFAULT_SETTINGS),
  DEFAULT_STORE: deepClone(DEFAULT_STORE),
};
